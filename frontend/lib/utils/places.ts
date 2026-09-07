/**
 * Deep links to a place on Google Maps.
 *
 * The model gives us a name and a loose location string, never coordinates or a
 * place id — so this builds a *search* URL rather than claiming to know the
 * canonical one. Google resolves it, which means a link can never be dead, only
 * imprecise. Resolving properly would mean the Places API: a paid key and a
 * lookup per activity, which for a month-long trip is hundreds of billed
 * requests per generated itinerary.
 *
 * The city and country are always appended, since a bare "Central Market" would
 * otherwise match one on the wrong continent.
 */
export function mapsSearchUrl(
  name: string,
  location: string | null | undefined,
  destination: string,
  country: string | null | undefined
): string {
  const query = [name, location, destination, country]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    // A location like "Kyoto" repeated in the destination adds nothing and can
    // skew the match, so keep each distinct term once.
    .filter((part, i, all) => all.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === i)
    .join(', ');

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
