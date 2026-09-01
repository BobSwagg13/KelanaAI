"""Fetch visa requirements for an Indonesian passport against a fixed list of
destinations and write a single Markdown knowledge-base document.

This talks to the Orizn Visa API (https://visa.orizn.app). The free tier is
100 requests/month, so this script is built to be run ONCE:

  - It makes exactly len(DESTINATIONS) requests, one per destination. No retries,
    no discovery calls, no pagination.
  - Every raw response is cached to knowledge/cache/visa-idn-raw.json.
  - The Markdown is rendered from that cache, so you can re-render the document
    (formatting tweaks, etc.) with `--from-cache` and spend zero API calls.

Usage (run from backend/):

    python knowledge/fetch_visa.py --dry-run     # show plan, call nothing
    python knowledge/fetch_visa.py               # fetch + render (asks to confirm)
    python knowledge/fetch_visa.py --from-cache  # re-render from cache only

The API key is read from VISA_API_KEY in the environment or backend/.env.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

API_URL = "https://visa.orizn.app/api/v1/visa"
PASSPORT = "IDN"
LANG = "en"
REQUEST_TIMEOUT = 20  # seconds
PACING_DELAY = 1.0    # seconds between calls, to be polite

# ISO3 code -> display name. 15 destinations => 15 requests.
DESTINATIONS: list[tuple[str, str]] = [
    ("SGP", "Singapore"),
    ("MYS", "Malaysia"),
    ("THA", "Thailand"),
    ("VNM", "Vietnam"),
    ("PHL", "Philippines"),
    ("JPN", "Japan"),
    ("KOR", "South Korea"),
    ("CHN", "China"),
    ("HKG", "Hong Kong"),
    ("AUS", "Australia"),
    ("GBR", "United Kingdom"),
    ("USA", "United States"),
    ("SAU", "Saudi Arabia"),
    ("ARE", "United Arab Emirates"),
    ("TUR", "Turkey"),
]

BASE_DIR = Path(__file__).resolve().parent
CACHE_PATH = BASE_DIR / "cache" / "visa-idn-raw.json"
OUTPUT_PATH = BASE_DIR.parent / "travel_guides" / "visa-indonesia-passport.md"


def _load_api_key() -> str:
    load_dotenv(BASE_DIR.parent / ".env")
    key = os.getenv("VISA_API_KEY")
    if not key:
        sys.exit(
            "VISA_API_KEY is not set. Add it to backend/.env or export it:\n"
            "    export VISA_API_KEY=orizn_visa_xxx"
        )
    return key


def _get_json(url: str, headers: dict) -> tuple[int, dict]:
    """One GET. Returns (status_code, parsed_body). Raises on transport error."""
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        # 4xx/5xx still carry a JSON body we want to keep.
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, {"_raw": raw}


def fetch_all(api_key: str) -> dict:
    """Make one request per destination. Failures are recorded, never retried."""
    headers = {"x-api-key": api_key}
    results: dict[str, dict] = {}

    for i, (code, name) in enumerate(DESTINATIONS, start=1):
        print(f"[{i}/{len(DESTINATIONS)}] {name} ({code}) ... ", end="", flush=True)
        query = urllib.parse.urlencode(
            {"passport": PASSPORT, "destination": code, "lang": LANG}
        )
        try:
            status, body = _get_json(f"{API_URL}?{query}", headers)
        except (urllib.error.URLError, ValueError, TimeoutError) as exc:
            print(f"FAILED ({exc.__class__.__name__})")
            results[code] = {"_error": str(exc), "_name": name}
            continue

        print("ok" if status == 200 else f"HTTP {status}")
        body["_http_status"] = status
        body["_name"] = name
        results[code] = body

        if i < len(DESTINATIONS):
            time.sleep(PACING_DELAY)

    payload = {
        "passport": PASSPORT,
        "lang": LANG,
        "fetched_on": date.today().isoformat(),
        "source": API_URL,
        "results": results,
    }
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"\nRaw responses cached to {CACHE_PATH}")
    return payload


def _fmt_list(items) -> str:
    if not items:
        return "  - (none listed)\n"
    return "".join(f"  - {str(x)}\n" for x in items)


def render_markdown(payload: dict) -> str:
    fetched_on = payload.get("fetched_on", "unknown date")
    lines: list[str] = []
    lines.append("# Visa Requirements for Indonesian Passport Holders\n")
    lines.append(
        f"Source: Orizn Visa API ({payload.get('source', API_URL)}). "
        f"Passport: Indonesia (IDN). Data fetched on {fetched_on}. "
        "The provider compiles this from 136 official government sources and "
        "refreshes it every two weeks; each record carries a `verified` flag "
        "indicating whether it is confirmed against an official source for this "
        "exact passport/destination pair. Always reconfirm with the destination's "
        "embassy before travel.\n"
    )

    lines.append("## Requirement type codes\n")
    lines.append(
        "- `visa_free` - no visa needed, enter with a valid passport\n"
        "- `visa_required` - obtain a visa from an embassy or consulate before travel\n"
        "- `e_visa` - apply online for an electronic visa before travel\n"
        "- `visa_on_arrival` - visa issued at the border or airport on entry\n"
        "- `eta` - an Electronic Travel Authorization must be obtained before travel\n"
        "- `no_admission` - entry is prohibited for this passport\n"
    )

    # Summary table.
    lines.append("## Summary\n")
    lines.append("| Destination | Requirement | Visa-free days | Verified |")
    lines.append("|-------------|-------------|----------------|----------|")
    for code, name in DESTINATIONS:
        entry = payload["results"].get(code, {})
        data = entry.get("data")
        if not data:
            err = entry.get("_error") or f"HTTP {entry.get('_http_status', '?')}"
            lines.append(f"| {name} ({code}) | _not retrieved: {err}_ | - | - |")
            continue
        req = data.get("requirement", "unknown")
        days = data.get("visa_free_days")
        days_str = str(days) if days not in (None, 0, False) else "-"
        verified = "yes" if data.get("verified") else "no"
        lines.append(f"| {name} ({code}) | `{req}` | {days_str} | {verified} |")
    lines.append("")

    # Per-destination detail.
    lines.append("## Details by destination\n")
    for code, name in DESTINATIONS:
        entry = payload["results"].get(code, {})
        data = entry.get("data")
        lines.append(f"### {name} ({code})\n")
        if not data:
            err = entry.get("_error") or f"HTTP {entry.get('_http_status', '?')}"
            lines.append(f"Not retrieved in this run: {err}\n")
            continue

        lines.append(f"- Requirement: `{data.get('requirement', 'unknown')}`")
        if data.get("visa_free_days") not in (None, 0, False):
            lines.append(f"- Visa-free stay: up to {data['visa_free_days']} days")
        lines.append(f"- Visa required: {'yes' if data.get('visa_required') else 'no'}")
        lines.append(f"- Verified against official source: "
                     f"{'yes' if data.get('verified') else 'no'}")
        if data.get("description"):
            lines.append(f"- Summary: {data['description']}")
        lines.append("")

        lines.append("Documents required:")
        lines.append(_fmt_list(data.get("documents_required")).rstrip("\n"))
        lines.append("")
        lines.append("Entry / application process:")
        proc = data.get("process") or []
        if proc:
            for n, step in enumerate(proc, start=1):
                lines.append(f"  {n}. {step}")
        else:
            lines.append("  - (none listed)")
        lines.append("")
        lines.append("Tips:")
        lines.append(_fmt_list(data.get("tips")).rstrip("\n"))
        lines.append("")

        info = data.get("country_info") or {}
        if info:
            lines.append(
                f"Country info: currency {info.get('currency', '?')}; "
                f"language {info.get('language', '?')}; "
                f"timezone {info.get('timezone', '?')}; "
                f"capital {info.get('capital', '?')}.\n"
            )

    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="print the plan and exit without calling the API")
    parser.add_argument("--from-cache", action="store_true",
                        help="render the Markdown from the cached raw responses only")
    parser.add_argument("--yes", action="store_true",
                        help="skip the confirmation prompt")
    args = parser.parse_args()

    if args.dry_run:
        print("DRY RUN - no requests will be made.\n")
        print(f"Passport : {PASSPORT}")
        print(f"Endpoint : {API_URL}")
        print(f"Requests : {len(DESTINATIONS)} (one per destination)")
        for code, name in DESTINATIONS:
            print(f"  - {name} ({code})")
        print(f"\nOutput   : {OUTPUT_PATH}")
        print(f"Cache    : {CACHE_PATH}")
        return

    if args.from_cache:
        if not CACHE_PATH.exists():
            sys.exit(f"No cache at {CACHE_PATH}. Run a real fetch first.")
        payload = json.loads(CACHE_PATH.read_text())
        OUTPUT_PATH.write_text(render_markdown(payload))
        print(f"Re-rendered from cache -> {OUTPUT_PATH}")
        return

    api_key = _load_api_key()
    print(f"About to make {len(DESTINATIONS)} requests to {API_URL}.")
    print("The Orizn free tier is 100 requests/month.")
    if not args.yes:
        if input("Continue? [y/N] ").strip().lower() != "y":
            print("Aborted. No requests made.")
            return

    payload = fetch_all(api_key)
    OUTPUT_PATH.write_text(render_markdown(payload))

    ok = sum(1 for c, _ in DESTINATIONS
             if payload["results"].get(c, {}).get("data"))
    print(f"\nWrote {OUTPUT_PATH}")
    print(f"{ok}/{len(DESTINATIONS)} destinations retrieved successfully.")
    if ok < len(DESTINATIONS):
        print("Some destinations failed - see the summary table in the document. "
              "Re-run only if you have request budget to spare.")


if __name__ == "__main__":
    main()
