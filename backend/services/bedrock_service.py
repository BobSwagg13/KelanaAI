from dotenv import load_dotenv
import boto3
import json
import logging
import os

load_dotenv()

logger = logging.getLogger(__name__)

client = boto3.client(
    service_name="bedrock-runtime",
    region_name=os.getenv("AWS_REGION")
)

# Measured against amazon.nova-lite-v1:0: a day of itinerary costs ~215 output
# tokens on top of a ~2000 token baseline, so this covers roughly a 28-day trip.
# Leaving it unset makes Bedrock apply a 2000-token default, which truncates
# anything past ~4 days mid-JSON.
MAX_OUTPUT_TOKENS = 8192


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


def _build_prompt(trip) -> str:
    return f"""
ROLE:
You are KelanaAI, an expert AI travel planner who specializes in creating
realistic, detailed, and enjoyable travel itineraries.

CONTEXT:
The traveler is planning a trip with the following information:

- Destination: {trip.destination}, {trip.country}
- Duration: {trip.days} days
- Total Budget: {trip.budget} {trip.currency}
- Daily Budget: {trip.daily_budget} {trip.currency}
- Travel Style: {trip.travel_style}
- Travel Month: {trip.travel_month}

TASK:
Create a detailed daily travel itinerary for the entire trip, along with
travel tips, local food recommendations, a budget breakdown, and
transportation guidance, all matching the traveler's style and budget.

OUTPUT:
Return ONLY a single valid JSON object (no markdown, no commentary) with
exactly this structure:

{{
  "trip_overview": {{
    "destination": "{trip.destination}",
    "country": "{trip.country}",
    "duration": {trip.days},
    "category": "{trip.category}",
    "daily_budget": {trip.daily_budget},
    "travel_month": "{trip.travel_month}"
  }},
  "daily_itinerary": [
    {{
      "day": 1,
      "theme": "Arrival and Exploration",
      "morning": [
        {{
          "time": "9:00 AM",
          "name": "Activity Name",
          "description": "Activity description",
          "location": "Specific location",
          "estimated_cost": 20,
          "duration": "2 hours",
          "category": "sightseeing"
        }}
      ],
      "afternoon": [],
      "evening": [],
      "estimated_daily_cost": 150
    }}
  ],
  "travel_tips": [
    {{
      "category": "safety",
      "title": "Safety Tip Title",
      "description": "Detailed safety advice"
    }}
  ],
  "local_food": [
    {{
      "name": "Restaurant Name",
      "description": "Description of the restaurant",
      "type": "restaurant",
      "estimated_cost": 30,
      "location": "Address or area",
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
    "getting_there": ["Flight from X to Y"],
    "getting_around": ["Metro", "Taxi", "Walking"],
    "estimated_costs": {{
      "metro_pass": 15
    }}
  }}
}}

Rules:
- "category" for each activity must be one of: sightseeing, food, culture, adventure, relaxation, shopping.
- "category" for each travel tip must be one of: safety, culture, money, transportation, general.
- Provide one "daily_itinerary" entry per day of the trip ({trip.days} total).
- All monetary values in the "{trip.currency}" currency, as plain numbers.
- Keep descriptions to one concise sentence so the JSON fits in the response.
- Ensure the JSON is syntactically valid and complete.
"""


def generate_recommendation(trip) -> dict:
    """Generate a structured recommendation for `trip`.

    Raises RecommendationError if the model was truncated, returned no JSON, or
    returned JSON missing the itinerary. Never returns a placeholder.
    """
    prompt = _build_prompt(trip)

    response = client.converse(
        modelId=os.getenv("MODEL_ID"),
        messages=[
            {
                "role": "user",
                "content": [{"text": prompt}]
            }
        ],
        inferenceConfig={
            "maxTokens": MAX_OUTPUT_TOKENS,
            "temperature": 0.7,
        },
    )

    stop_reason = response.get("stopReason")
    usage = response.get("usage", {})

    # A truncated response still arrives as a well-formed HTTP 200, so this is
    # the only reliable signal that the itinerary is incomplete.
    if stop_reason != "end_turn":
        logger.error(
            "Bedrock stopped early for trip %s: stopReason=%s usage=%s",
            getattr(trip, "id", "?"), stop_reason, usage,
        )
        if stop_reason == "max_tokens":
            raise RecommendationError(
                f"The itinerary was too long to generate in one response "
                f"({trip.days} days). Try a shorter trip."
            )
        raise RecommendationError(
            f"The AI stopped unexpectedly (reason: {stop_reason})."
        )

    ai_text = response["output"]["message"]["content"][0]["text"]

    try:
        recommendation = json.loads(_extract_json_object(ai_text))
    except json.JSONDecodeError as e:
        logger.error(
            "Failed to parse AI response as JSON for trip %s: %s\nRaw response: %s",
            getattr(trip, "id", "?"), e, ai_text,
        )
        raise RecommendationError(
            "The AI returned a malformed itinerary. Please try again."
        ) from e

    if not recommendation.get("daily_itinerary"):
        logger.error(
            "AI returned an empty itinerary for trip %s. Raw response: %s",
            getattr(trip, "id", "?"), ai_text,
        )
        raise RecommendationError(
            "The AI returned an empty itinerary. Please try again."
        )

    return recommendation
