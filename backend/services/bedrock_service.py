from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from botocore.config import Config
import boto3
import json
import logging
import os

load_dotenv()

logger = logging.getLogger(__name__)

# amazon.nova-lite-v1:0 accepts a 300K context but emits at most 5K output
# tokens per request. Asking for more is silently clamped, which is how the
# previous single-call design quietly capped out around 14 days while claiming
# to cover 28. Every call below stays under this.
MODEL_MAX_OUTPUT_TOKENS = 5000

OUTLINE_MAX_TOKENS = 2500
BATCH_MAX_TOKENS = 4500
STATIC_MAX_TOKENS = 2500

# A fully-described day (2-3 activities in each of three blocks) costs roughly
# 550-650 output tokens, so five days sits near 3,300 against the 4,500 cap.
# Six would leave too little headroom for a verbose day.
DAYS_PER_BATCH = 5

# Batches plus the static-sections call all run at once; a 30-day trip is seven
# tasks, so this fits them in two waves.
MAX_WORKERS = 6

TEMPERATURE = 0.7

client = boto3.client(
    service_name="bedrock-runtime",
    region_name=os.getenv("AWS_REGION"),
    # The connection pool has to be at least as wide as the thread pool or the
    # workers serialise on sockets. `standard` retries give exponential backoff
    # with jitter on ThrottlingException and 5xx for free — don't hand-roll it.
    config=Config(
        max_pool_connections=MAX_WORKERS + 2,
        connect_timeout=10,
        read_timeout=60,
        retries={"max_attempts": 5, "mode": "standard"},
    ),
)

ACTIVITY_CATEGORIES = "sightseeing, food, culture, adventure, relaxation, shopping"
TIP_CATEGORIES = "safety, culture, money, transportation, general"

# The frontend types `category` as a closed union and picks an icon from it. The
# model still invents values ("transportation", "local experience") however
# firmly the prompt forbids it, so the contract is enforced here instead of
# trusted. Anything unrecognised becomes sightseeing.
VALID_ACTIVITY_CATEGORIES = frozenset(ACTIVITY_CATEGORIES.split(", "))
CATEGORY_ALIASES = {
    "transportation": "sightseeing",
    "transport": "sightseeing",
    "travel": "sightseeing",
    "local experience": "culture",
    "cultural": "culture",
    "history": "culture",
    "historic": "culture",
    "nightlife": "relaxation",
    "entertainment": "relaxation",
    "dining": "food",
    "restaurant": "food",
    "market": "shopping",
    "nature": "adventure",
    "outdoor": "adventure",
}
TIME_BLOCKS = ("morning", "afternoon", "evening")


class RecommendationError(Exception):
    """Raised when the model did not return a usable recommendation.

    Callers must surface this to the user rather than persisting a placeholder:
    a stored empty recommendation is indistinguishable from a real one and gets
    served back forever.
    """


def _extract_json_object(text: str) -> str:
    """Return the first complete top-level JSON object in `text`.

    Walks the string tracking brace depth (ignoring braces inside string
    literals) so that trailing prose or markdown fences can't corrupt the slice.
    A naive `text.rfind('}')` picks up a *nested* closing brace when the response
    is truncated, producing an unbalanced fragment.
    """
    start = text.find('{')
    if start == -1:
        raise RecommendationError("Model response contained no JSON object.")

    depth = 0
    in_string = False
    escaped = False

    for i in range(start, len(text)):
        ch = text[i]

        if in_string:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return text[start:i + 1]

    raise RecommendationError(
        "Model response ended with an unterminated JSON object "
        "(the output was cut off before it could be closed)."
    )


def _converse(prompt: str, *, max_tokens: int, label: str, trip_id) -> dict:
    """One Bedrock call, parsed into a dict.

    Every generation step goes through here so the truncation and parse
    invariants live in exactly one place. `label` names the step ("outline",
    "days 6-10") so a failure says which part of the itinerary broke.
    """
    response = client.converse(
        modelId=os.getenv("MODEL_ID"),
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={
            "maxTokens": min(max_tokens, MODEL_MAX_OUTPUT_TOKENS),
            "temperature": TEMPERATURE,
        },
    )

    stop_reason = response.get("stopReason")

    # A truncated response still arrives as a well-formed HTTP 200, so this is
    # the only reliable signal that the output is incomplete.
    if stop_reason != "end_turn":
        logger.error(
            "Bedrock stopped early for trip %s (%s): stopReason=%s usage=%s",
            trip_id, label, stop_reason, response.get("usage", {}),
        )
        raise RecommendationError(
            f"The AI ran out of room while writing {label}. Please try again."
        )

    text = response["output"]["message"]["content"][0]["text"]

    try:
        return json.loads(_extract_json_object(text))
    except json.JSONDecodeError as e:
        logger.error(
            "Failed to parse %s as JSON for trip %s: %s\nRaw response: %s",
            label, trip_id, e, text,
        )
        raise RecommendationError(
            f"The AI returned a malformed response for {label}. Please try again."
        ) from e


def _trip_context(trip) -> str:
    return f"""- Destination: {trip.destination}, {trip.country}
- Duration: {trip.days} days
- Total Budget: {trip.budget} {trip.currency}
- Daily Budget: {trip.daily_budget} {trip.currency}
- Travel Style: {trip.travel_style}
- Traveling As: {trip.travel_group or "not specified"}
- Travel Month: {trip.travel_month}"""


# What each travel style and group should actually change about a day. Without
# these the prompt merely restated the traveller's choices back at the model and
# they barely moved the itinerary.
STYLE_GUIDANCE = {
    "sightseeing": "lead with the city's signature landmarks and viewpoints",
    "cultural": "lean on museums, heritage sites, traditions and performances",
    "adventure": "favour hiking, water sports and physically active days",
    "nature": "favour parks, gardens, wildlife and scenery, including a day trip out of the city",
    "food": "build days around markets, street food, cooking classes and notable restaurants",
    "relaxed": "keep an unhurried pace with fewer stops, long meals, cafes and parks",
    # Legacy ids from when style doubled as a budget tier. Regenerating an old
    # trip should still get useful guidance.
    "backpacker": "favour free and low-cost sights, local transport and casual food",
    "standard": "keep a balanced mix of paid highlights and free wandering",
    "luxury": "favour premium, curated and reservation-worthy experiences",
}

GROUP_GUIDANCE = {
    "solo": (
        "keep it flexible and easy to do alone - walkable central areas, "
        "activities that are comfortable solo, and safe choices after dark"
    ),
    "couple": "favour scenic and romantic choices and quieter dinners for two",
    "family": (
        "keep the pace child-friendly - shorter journeys, somewhere to run "
        "around, food children will eat, and no late nights"
    ),
    "friends": (
        "favour places that work for a group - venues that take a booking, "
        "shared activities, and livelier evenings"
    ),
}


def _audience_guidance(trip) -> str:
    """One line telling the model what the style and group should change."""
    parts = []
    style = STYLE_GUIDANCE.get((trip.travel_style or "").lower())
    if style:
        parts.append(f"Their travel style is {trip.travel_style}: {style}.")
    group = GROUP_GUIDANCE.get((trip.travel_group or "").lower())
    if group:
        parts.append(f"They are travelling as {trip.travel_group}: {group}.")
    return " ".join(parts)


# --------------------------------------------------------------------------- #
# outline                                                                      #
# --------------------------------------------------------------------------- #

def _build_outline_prompt(trip) -> str:
    return f"""
ROLE:
You are KelanaAI, an expert travel planner.

CONTEXT:
{_trip_context(trip)}

AUDIENCE:
{_audience_guidance(trip)}

TASK:
Sketch a day-by-day outline for the whole trip. Give each day a theme, the
neighbourhood or area it centres on, its headline attractions, and where the
traveller eats dinner and spends the evening. Group days by geography so the
traveller is not crossing the city back and forth.

This outline is the only place the whole trip is visible at once, so it is what
keeps the days from repeating each other.

OUTPUT:
Return ONLY a single valid JSON object (no markdown, no commentary):

{{
  "days": [
    {{
      "day": 1,
      "theme": "Old town and arrival",
      "area": "Historic centre",
      "anchors": ["Main Square", "City Cathedral"],
      "dinner": "Name of a restaurant in or near that area",
      "evening": "Name of a bar, night market, venue or viewpoint nearby"
    }}
  ]
}}

Rules:
- Exactly {trip.days} entries, numbered 1 to {trip.days}.
- 2 to 3 anchors per day, each a specific named place.
- "dinner" and "evening" are each the proper name of one real venue, chosen to
  sit in or near that day's area.
- Across the whole trip, no place may appear twice — not as an anchor, not as a
  dinner, not as an evening venue. Every one of the {trip.days} dinner picks
  must be a different restaurant, and every evening pick a different venue.
- Names only — no descriptions.
"""


def _generate_outline(trip) -> dict:
    outline = _converse(
        _build_outline_prompt(trip),
        max_tokens=OUTLINE_MAX_TOKENS,
        label="the trip outline",
        trip_id=getattr(trip, "id", "?"),
    )
    if not outline.get("days"):
        raise RecommendationError(
            "The AI could not sketch an outline for this trip. Please try again."
        )
    return outline


# --------------------------------------------------------------------------- #
# day batches                                                                  #
# --------------------------------------------------------------------------- #

def _day_batches(total_days: int, size: int = DAYS_PER_BATCH) -> list[list[int]]:
    return [
        list(range(start, min(start + size, total_days + 1)))
        for start in range(1, total_days + 1, size)
    ]


def _build_batch_prompt(trip, outline: dict, days: list[int]) -> str:
    return f"""
ROLE:
You are KelanaAI, an expert travel planner.

CONTEXT:
{_trip_context(trip)}

AUDIENCE:
{_audience_guidance(trip)}

OUTLINE FOR THE WHOLE TRIP:
{json.dumps(outline, ensure_ascii=False)}

YOUR ASSIGNMENT:
Write the full schedule for days {days[0]} to {days[-1]} only. The other days
are shown above so you do not reuse their anchors or repeat their venues.

OUTPUT:
Return ONLY a single valid JSON object (no markdown, no commentary):

{{
  "daily_itinerary": [
    {{
      "day": {days[0]},
      "theme": "Old town and arrival",
      "morning": [
        {{
          "time": "9:00 AM",
          "name": "Main Square",
          "description": "Start in the historic heart of the city, ringed by
                          guild houses and cafes.",
          "location": "Historic centre",
          "estimated_cost": 0,
          "duration": "1.5 hours",
          "category": "sightseeing"
        }},
        {{
          "time": "10:45 AM",
          "name": "City Cathedral",
          "description": "Climb the tower for the best view over the rooftops.",
          "location": "Historic centre",
          "estimated_cost": 8,
          "duration": "1 hour",
          "category": "culture"
        }}
      ],
      "afternoon": [
        {{
          "time": "1:00 PM",
          "name": "City History Museum",
          "description": "Traces the city from its founding to the present day.",
          "location": "Museum quarter",
          "estimated_cost": 12,
          "duration": "2 hours",
          "category": "culture"
        }},
        {{
          "time": "3:30 PM",
          "name": "Central Market",
          "description": "Browse produce stalls and sample local snacks where
                          residents actually shop.",
          "location": "Market street",
          "estimated_cost": 10,
          "duration": "1.5 hours",
          "category": "shopping"
        }}
      ],
      "evening": [
        {{
          "time": "7:00 PM",
          "name": "Dinner at a named local restaurant",
          "description": "Regional cooking in a long-running family dining room.",
          "location": "Old town",
          "estimated_cost": 30,
          "duration": "1.5 hours",
          "category": "food"
        }},
        {{
          "time": "9:00 PM",
          "name": "Riverside bar street",
          "description": "Wind down with a drink where the terraces face the water.",
          "location": "Riverside",
          "estimated_cost": 15,
          "duration": "2 hours",
          "category": "relaxation"
        }}
      ],
      "estimated_daily_cost": 95
    }}
  ]
}}

Rules:
- Exactly one entry for each of days {days[0]} to {days[-1]}, and no others.
- "morning" must contain 2 to 3 activities.
- "afternoon" must contain 2 to 3 activities. At least one must be a cultural
  site (museum, temple, gallery, historic building), and at least one must be a
  hands-on or neighbourhood outing (market, walking route, workshop, class).
- "evening" must contain 2 to 3 entries. At least one must be a specific named
  dinner venue, and at least one must be an after-dinner option (bar, night
  market, live music, show, viewpoint).
- Every day gets all three blocks filled, including the last day of the trip —
  a departure day still gets a morning, an afternoon and an evening.
- Every activity needs time, name, description, location, estimated_cost,
  duration and category.
- "name" must be the proper name of a real, specific place. Never write a
  generic stand-in such as "Lunch at a local restaurant", "a nearby cafe" or
  "local izakaya" — name the actual venue.
- Descriptions are one or two sentences.
- "category" must be copied exactly from this list and nothing else:
  {ACTIVITY_CATEGORIES}. These are the only permitted values — do not invent a
  category, and do not describe the activity in this field.
- Build each day's daytime around that day's anchors from the outline.
- Use that day's "dinner" from the outline as the named dinner venue, and that
  day's "evening" as the after-dinner option. They were chosen to be unique
  across the whole trip, so do not substitute your own — that is what stops the
  same restaurant appearing on half the days.
- Keep lunch and any extra stops in or near that day's area, and do not use the
  same venue twice across the days you were assigned.
- Every day must reflect the AUDIENCE note above: it decides what kind of
  places belong in the plan and how hard the days are pushed.
- Lunch must be a different venue from that day's dinner — never send the
  traveller to the same restaurant twice in one day.
- All monetary values in {trip.currency}, as plain numbers.
- "estimated_daily_cost" is the sum of that day's activities, and should land
  near the {trip.daily_budget} {trip.currency} daily budget.
"""


def _normalize_categories(day_objs: list[dict]) -> None:
    """Coerce every activity's `category` into the union the frontend declares."""
    for day in day_objs:
        for block in TIME_BLOCKS:
            for activity in day.get(block) or []:
                raw = str(activity.get("category", "")).strip().lower()
                if raw in VALID_ACTIVITY_CATEGORIES:
                    activity["category"] = raw
                    continue
                mapped = CATEGORY_ALIASES.get(raw, "sightseeing")
                logger.info("Coerced activity category %r -> %r", raw, mapped)
                activity["category"] = mapped


def _has_all_blocks(day_obj: dict) -> bool:
    return all(day_obj.get(block) for block in TIME_BLOCKS)


def _is_fully_scheduled(day_objs: list[dict], days: list[int]) -> bool:
    """Whether the batch returned every day it owns with all three blocks filled."""
    by_day = {d.get("day"): d for d in day_objs}
    return all(day in by_day and _has_all_blocks(by_day[day]) for day in days)


def _merge_attempts(first: list[dict], second: list[dict], days: list[int]) -> list[dict]:
    """Best available object for each day across two attempts.

    The attempts usually fall short on *different* days, so combining them
    recovers a complete batch far more often than picking one wholesale — which
    previously failed the entire trip whenever neither attempt was perfect.
    """
    wanted = set(days)
    best: dict[int, dict] = {}
    for obj in [*first, *second]:
        day = obj.get("day")
        if day not in wanted:
            continue
        current = best.get(day)
        if current is None or (not _has_all_blocks(current) and _has_all_blocks(obj)):
            best[day] = obj
    return [best[d] for d in sorted(best)]


def _generate_day_batch(trip, outline: dict, days: list[int]) -> list[dict]:
    """Expand one contiguous run of days.

    Retried once, for a hard failure (truncated or malformed) and also for a
    thin result — the model reliably shortchanges the final day of a trip,
    leaving an empty evening. Batches are small and independent, so re-rolling
    is cheap. A second thin result is kept rather than failing the whole trip:
    a sparse day is a worse itinerary, not a broken one.
    """
    prompt = _build_batch_prompt(trip, outline, days)
    label = f"days {days[0]}-{days[-1]}"
    trip_id = getattr(trip, "id", "?")

    def attempt() -> list[dict]:
        payload = _converse(
            prompt, max_tokens=BATCH_MAX_TOKENS, label=label, trip_id=trip_id
        )
        return payload.get("daily_itinerary") or []

    try:
        first = attempt()
        if _is_fully_scheduled(first, days):
            _normalize_categories(first)
            return first
        logger.warning("%s came back thin for trip %s; retrying", label, trip_id)
    except RecommendationError:
        logger.warning("%s failed for trip %s; retrying", label, trip_id)
        first = []

    try:
        second = attempt()
    except RecommendationError:
        if first:
            _normalize_categories(first)
            return first
        raise

    combined = _merge_attempts(first, second, days)
    _normalize_categories(combined)
    return combined


# --------------------------------------------------------------------------- #
# static sections                                                              #
# --------------------------------------------------------------------------- #

def _build_static_prompt(trip) -> str:
    return f"""
ROLE:
You are KelanaAI, an expert travel planner.

CONTEXT:
{_trip_context(trip)}

TASK:
Produce the non-itinerary sections of this trip's plan: travel tips, local food
recommendations, a budget breakdown, and transportation guidance.

OUTPUT:
Return ONLY a single valid JSON object (no markdown, no commentary):

{{
  "travel_tips": [
    {{
      "category": "safety",
      "title": "Keep valuables close on the metro",
      "description": "Pickpocketing concentrates on the busiest tourist lines."
    }}
  ],
  "local_food": [
    {{
      "name": "Restaurant Name",
      "description": "What it serves and why it is worth the trip.",
      "type": "restaurant",
      "estimated_cost": 30,
      "location": "Neighbourhood or address",
      "must_try_dishes": ["Dish 1", "Dish 2"]
    }}
  ],
  "budget_breakdown": {{
    "accommodation": 500,
    "food": 400,
    "transportation": 200,
    "activities": 300,
    "miscellaneous": 100,
    "total": {trip.budget},
    "daily_average": {trip.daily_budget}
  }},
  "transportation": {{
    "getting_there": [
      "Fly into the city's main international airport (IATA code), about 30 km
       from the centre.",
      "From the airport, the express rail link reaches the centre in 35 minutes.",
      "High-speed rail connects from other major cities in the region.",
      "Long-distance coaches and ferries serve the city if you prefer overland
       or sea routes."
    ],
    "getting_around": ["<transit system this city actually has>", "..."],
    "estimated_costs": {{
      "<name of a real fare or pass here>": 12
    }}
  }}
}}

Rules:
- 6 to 8 "travel_tips", spread across these categories: {TIP_CATEGORIES}.
- 6 to 8 "local_food" entries with a mix of "type" values: restaurant,
  street_food, market, cafe.
- "budget_breakdown" figures must add up to {trip.budget} {trip.currency}.
- "getting_there": name the destination's main international gateway airport
  with its IATA code and roughly how far it is from the centre, then how to get
  from that airport into the city, then any rail, coach, road or ferry
  alternative that genuinely exists for this destination.
- NEVER name a departure city, country or airport — the traveller's origin is
  unknown. Never write a placeholder such as "X", "your city" or "Origin".
- "getting_around": 3 to 5 options that this specific city actually has, named
  the way locals name them (the actual subway, tram, bus, bike-share or ferry
  service) — not a generic list.
- "estimated_costs": 3 to 5 line items keyed by the real name of a fare, ticket
  or travel pass sold in this city, with numeric values.
- All monetary values in {trip.currency}, as plain numbers.
"""


def _generate_static_sections(trip) -> dict:
    return _converse(
        _build_static_prompt(trip),
        max_tokens=STATIC_MAX_TOKENS,
        label="the trip details",
        trip_id=getattr(trip, "id", "?"),
    )


# --------------------------------------------------------------------------- #
# assembly                                                                     #
# --------------------------------------------------------------------------- #

def _validate_days(day_objs: list[dict], expected: int) -> list[dict]:
    """Dedupe, order, and confirm every day is present.

    Batches are generated independently, so a model can hand back the same day
    twice. A duplicate is recoverable (keep the first); a missing day is not,
    because the UI would render a gap with no explanation.
    """
    by_day: dict[int, dict] = {}
    for obj in day_objs:
        day = obj.get("day")
        if not isinstance(day, int) or not 1 <= day <= expected:
            continue
        if day in by_day:
            logger.warning("Duplicate day %s in generated itinerary; keeping the first", day)
            continue
        by_day[day] = obj

    missing = [d for d in range(1, expected + 1) if d not in by_day]
    if missing:
        listed = ", ".join(str(d) for d in missing)
        raise RecommendationError(
            f"The itinerary came back missing day {listed}. Please try again."
        )

    return [by_day[d] for d in range(1, expected + 1)]


def _merge(trip, day_objs: list[dict], static: dict) -> dict:
    """Assemble the final recommendation.

    `trip_overview` is built here rather than asked for: every field is already
    on the trip row, so generating it would spend tokens on data we hold and
    invite the model to contradict it.
    """
    return {
        "trip_overview": {
            "destination": trip.destination,
            "country": trip.country,
            "duration": trip.days,
            "category": trip.category,
            "daily_budget": trip.daily_budget,
            "travel_month": trip.travel_month,
        },
        "daily_itinerary": day_objs,
        "travel_tips": static.get("travel_tips") or [],
        "local_food": static.get("local_food") or [],
        "budget_breakdown": static.get("budget_breakdown") or {},
        "transportation": static.get("transportation") or {},
    }


def generate_recommendation(trip) -> dict:
    """Generate a structured recommendation for `trip`.

    Three stages: one outline call fixes the shape of the trip, then the day
    batches and the static sections run concurrently against it. Splitting the
    work is what allows a fully-detailed day (2-3 activities per block) at any
    supported trip length — a single call cannot, because the model emits at
    most 5K output tokens.

    Raises RecommendationError if any stage fails. Never returns a partial: the
    caller must not persist anything on failure.
    """
    outline = _generate_outline(trip)
    batches = _day_batches(trip.days)

    day_objs: list[dict] = []
    pool = ThreadPoolExecutor(max_workers=MAX_WORKERS)
    try:
        batch_futures = [
            pool.submit(_generate_day_batch, trip, outline, batch) for batch in batches
        ]
        static_future = pool.submit(_generate_static_sections, trip)

        for future in as_completed(batch_futures):
            day_objs.extend(future.result())
        static = static_future.result()
    finally:
        # On success this is a no-op; on failure it drops queued work rather
        # than making the user wait out batches whose result is now useless.
        pool.shutdown(wait=False, cancel_futures=True)

    return _merge(trip, _validate_days(day_objs, trip.days), static)
