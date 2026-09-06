"""Fetch a destination photo from Pixabay.

Called when a trip is created. Pixabay's terms shape the design:

  - Permanent hotlinking is not allowed, and `webformatURL` is documented as
    valid for 24 hours, so linking their URL would both breach the terms and
    break by the next day. We download the bytes and serve our own copy.
  - Attribution is required wherever the image is shown, so the contributor's
    name and their Pixabay page travel with the image.
  - Responses must be cached for 24 hours. Storing one image per trip and never
    re-querying satisfies that comfortably.

The bytes are stored in Postgres rather than object storage: a 1280px Pixabay
JPEG is around 60-70 KB, so a thousand trips is well under a hundred megabytes,
and it keeps the feature free of any bucket, IAM policy or extra credentials.

Nothing here raises. A trip without a photo is a trip that looks plainer; a trip
that failed to save because a stock-photo API was down is a bug.
"""

from dotenv import load_dotenv
import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request

load_dotenv()

logger = logging.getLogger(__name__)

PIXABAY_URL = "https://pixabay.com/api/"

# Kept tight on purpose: this runs inline with trip creation, so it has to bail
# out fast when Pixabay is slow rather than hold up the response.
SEARCH_TIMEOUT = 5
DOWNLOAD_TIMEOUT = 10

# largeImageURL tops out at 1280px and measures ~70 KB; anything past this is a
# sign we fetched something unexpected and should be dropped rather than stored.
MAX_IMAGE_BYTES = 2 * 1024 * 1024


def _search(destination: str, api_key: str) -> dict | None:
    """Top Pixabay hit for this destination, or None."""
    query = urllib.parse.urlencode({
        "key": api_key,
        "q": f"{destination} landscape",
        "image_type": "photo",
        "orientation": "horizontal",
        "safesearch": "true",
        "order": "popular",
        "per_page": 3,
    })

    with urllib.request.urlopen(
        f"{PIXABAY_URL}?{query}", timeout=SEARCH_TIMEOUT
    ) as response:
        payload = json.loads(response.read().decode("utf-8"))

    hits = payload.get("hits") or []
    return hits[0] if hits else None


def _download(url: str) -> bytes | None:
    # Pixabay's CDN rejects requests without a User-Agent.
    req = urllib.request.Request(url, headers={"User-Agent": "KelanaAI/1.0"})
    with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT) as response:
        data = response.read(MAX_IMAGE_BYTES + 1)

    if len(data) > MAX_IMAGE_BYTES:
        logger.warning("Pixabay image exceeded %s bytes; skipping", MAX_IMAGE_BYTES)
        return None
    return data


def fetch_trip_image(destination: str, trip_id: int) -> dict | None:
    """Return ``{"data", "credit_name", "credit_url"}`` for `destination`.

    Returns None — never raises — when the feature is unconfigured, Pixabay has
    no match, or anything along the way fails. The caller simply leaves the
    trip's image columns empty.
    """
    api_key = os.getenv("PIXABAY_API_KEY")
    if not api_key:
        logger.info("PIXABAY_API_KEY unset; skipping photo for trip %s", trip_id)
        return None

    try:
        hit = _search(destination, api_key)
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as e:
        logger.warning("Pixabay search failed for %r: %s", destination, e)
        return None

    if not hit:
        logger.info("Pixabay had no photo for %r", destination)
        return None

    source = hit.get("largeImageURL") or hit.get("webformatURL")
    if not source:
        return None

    try:
        data = _download(source)
    except (urllib.error.URLError, TimeoutError) as e:
        logger.warning("Pixabay image download failed for %r: %s", destination, e)
        return None

    if not data:
        return None

    return {
        "data": data,
        "credit_name": hit.get("user") or "Pixabay",
        "credit_url": hit.get("pageURL") or "https://pixabay.com",
    }
