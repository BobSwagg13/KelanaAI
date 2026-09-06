"""Fetch a destination photo from Pixabay and store our own copy in S3.

Called when a trip is created. Pixabay's terms shape the whole design:

  - Permanent hotlinking is not allowed, and `webformatURL` is documented as
    valid for 24 hours, so linking their URL would both breach the terms and
    break by the next day. We download the bytes and serve our own copy.
  - Attribution is required wherever the image is shown, so the contributor's
    name and their Pixabay page travel with the URL.
  - Responses must be cached for 24 hours. Storing one image per trip and never
    re-querying satisfies that comfortably.

Nothing here raises. A trip without a photo is a trip that looks plainer; a trip
that failed to save because a stock-photo API was down is a bug.
"""

from dotenv import load_dotenv
from botocore.exceptions import BotoCoreError, ClientError
import boto3
import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request

load_dotenv()

logger = logging.getLogger(__name__)

PIXABAY_URL = "https://pixabay.com/api/"

# Kept tight on purpose: this runs inline with trip creation, so the whole
# lookup has to stay well under a second of perceived cost in the common case
# and bail out fast when Pixabay is slow.
SEARCH_TIMEOUT = 5
DOWNLOAD_TIMEOUT = 10

# Pixabay caps downloads we'd want at 1280px (largeImageURL); anything bigger
# than this is a sign we grabbed something unexpected.
MAX_IMAGE_BYTES = 8 * 1024 * 1024


def _bucket() -> str | None:
    return os.getenv("TRIP_IMAGE_BUCKET")


def _search(destination: str, api_key: str) -> dict | None:
    """Top Pixabay hit for this destination, or None."""
    query = urllib.parse.urlencode({
        "key": api_key,
        # The caller asked for landscape shots of the city specifically.
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
    req = urllib.request.Request(url, headers={"User-Agent": "KelanaAI/1.0"})
    with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT) as response:
        data = response.read(MAX_IMAGE_BYTES + 1)

    if len(data) > MAX_IMAGE_BYTES:
        logger.warning("Pixabay image exceeded %s bytes; skipping", MAX_IMAGE_BYTES)
        return None
    return data


def _upload(data: bytes, bucket: str, key: str) -> str:
    """Put the image in S3 and return the URL the browser will load."""
    region = os.getenv("AWS_REGION")
    s3 = boto3.client("s3", region_name=region)
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType="image/jpeg",
        # Stock photos never change once written, so let browsers keep them.
        CacheControl="public, max-age=31536000, immutable",
    )
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


def fetch_trip_image(destination: str, trip_id: int) -> dict | None:
    """Return ``{"url", "credit_name", "credit_url"}`` for `destination`.

    Returns None — never raises — when the feature is unconfigured, Pixabay has
    no match, or anything along the way fails. The caller simply leaves the
    trip's image columns empty.
    """
    api_key = os.getenv("PIXABAY_API_KEY")
    bucket = _bucket()
    if not api_key or not bucket:
        logger.info("Trip images not configured; skipping lookup for trip %s", trip_id)
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

    try:
        url = _upload(data, bucket, f"trips/{trip_id}.jpg")
    except (BotoCoreError, ClientError) as e:
        logger.warning("Could not store trip image for trip %s: %s", trip_id, e)
        return None

    return {
        "url": url,
        "credit_name": hit.get("user") or "Pixabay",
        "credit_url": hit.get("pageURL") or "https://pixabay.com",
    }
