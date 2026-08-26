import type { SelectedLocation } from '@/lib/types/trip';
import type { AppError } from '@/lib/types/errors';

interface NominatimResponse {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    country?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

const CACHE_PREFIX = 'kelanaai_geocode_';

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

    const data: NominatimResponse = await response.json();

    const name =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.state ||
      'Unknown Location';

    const country = data.address.country || 'Unknown Country';

    const location: SelectedLocation = { latitude, longitude, name, country };
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
