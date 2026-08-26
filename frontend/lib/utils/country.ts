/**
 * Country presentation helpers.
 *
 * Trips store an ISO 3166-1 alpha-2 code captured from Nominatim at creation
 * time. It is null for trips created before the column existed and for points
 * with no country (ocean clicks), so every helper here tolerates absence.
 */

const ALPHA2 = /^[a-z]{2}$/i;

// Regional Indicator Symbol Letter A. 'US' -> U+1F1FA U+1F1F8 -> 🇺🇸
const REGIONAL_INDICATOR_A = 0x1f1e6;
const LETTER_A = 'A'.charCodeAt(0);

/**
 * Emoji flag for an ISO 3166-1 alpha-2 code, or null when it can't be derived.
 *
 * Returning null rather than a placeholder lets callers pick their own fallback
 * (we render a Globe icon), which also avoids the tofu box on platforms that
 * don't ship flag glyphs.
 */
export function countryCodeToFlag(code: string | null | undefined): string | null {
  if (!code || !ALPHA2.test(code)) return null;

  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(REGIONAL_INDICATOR_A + char.charCodeAt(0) - LETTER_A))
    .join('');
}

/** "Kyoto, Japan" — or just the destination when the country is unknown. */
export function formatDestination(
  destination: string,
  country: string | null | undefined
): string {
  return country ? `${destination}, ${country}` : destination;
}
