import type { SelectedLocation } from '@/lib/types/trip';
import type { AppError } from '@/lib/types/errors';

interface NominatimAddress {
  country?: string;
  country_code?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
}

interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: NominatimAddress;
}

// v2: entries cached by v1 predate `country_code`, and a stale hit would
// silently produce a trip with no flag. Bumping the prefix retires them.
const CACHE_PREFIX = 'kelanaai_geocode_v2_';

function cacheKey(latitude: number, longitude: number): string {
  return `${CACHE_PREFIX}${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
}

function readCache(latitude: number, longitude: number): SelectedLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(latitude, longitude));
    return raw ? (JSON.parse(raw) as SelectedLocation) : null;
  } catch {
    return null;
  }
}

function writeCache(location: SelectedLocation): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      cacheKey(location.latitude, location.longitude),
      JSON.stringify(location)
    );
  } catch {
    // sessionStorage unavailable or full — caching is a non-critical optimization
  }
}

function extractName(address: NominatimAddress, fallback: string): string {
  return address.city || address.town || address.village || address.state || fallback;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<SelectedLocation> {
  const cached = readCache(latitude, longitude);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data: NominatimPlace = await response.json();

    const name = extractName(data.address, 'Unknown Location');
    const country = data.address.country || 'Unknown Country';
    // Nominatim returns lowercase alpha-2 ("id", "jp"); absent over open water.
    const country_code = data.address.country_code || undefined;

    const location: SelectedLocation = {
      latitude,
      longitude,
      name,
      country,
      country_code,
    };
    writeCache(location);
    return location;
  } catch {
    const error: AppError = {
      type: 'geocoding',
      message: 'Unable to determine the location. Please try selecting a different point.',
      retryable: true,
    };
    throw error;
  }
}

export interface PlaceSearchResult extends SelectedLocation {
  /** Full location path from Nominatim, to disambiguate similarly-named places. */
  displayName: string;
}

const SEARCH_RESULT_LIMIT = 6;
export const PLACE_SEARCH_MIN_LENGTH = 2;

/**
 * Forward-search place names via Nominatim, for a type-to-search destination
 * field. Results are ranked by Nominatim's relevance ordering, which in
 * practice surfaces the closest-matching names first for partial input (e.g.
 * "Kyo" -> Kyoto).
 *
 * Pass an AbortSignal so a fast typist's earlier request can be cancelled
 * rather than racing a later one and overwriting its results.
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < PLACE_SEARCH_MIN_LENGTH) {
    return [];
  }

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1` +
    `&limit=${SEARCH_RESULT_LIMIT}&q=${encodeURIComponent(trimmed)}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error('Place search failed');
  }

  const data: NominatimPlace[] = await response.json();

  return data
    .filter((place) => place.lat && place.lon)
    .map((place) => {
      const fallbackName = place.display_name.split(',')[0]?.trim() || place.display_name;
      return {
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        name: extractName(place.address, fallbackName),
        country: place.address.country || 'Unknown Country',
        country_code: place.address.country_code || undefined,
        displayName: place.display_name,
      };
    });
}
