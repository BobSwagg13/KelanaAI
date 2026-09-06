import { z } from 'zod';
import type { StructuredRecommendation } from './recommendation';

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2, lowercase. Absent for ocean clicks. */
  country_code?: string;
}

/**
 * Upper bound on trip length, mirrored by MAX_TRIP_DAYS in the backend.
 * Keeps the generated itinerary inside the model's output token budget.
 */
export const MAX_TRIP_DAYS = 30;

export const tripFormSchema = z.object({
  destination: z.string().min(1, 'Please select a destination on the map'),
  country: z.string().min(1, 'Country is required'),
  country_code: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  days: z
    .number({ error: 'Days is required' })
    .int('Days must be a whole number')
    .min(1, 'Trip must be at least 1 day')
    .max(MAX_TRIP_DAYS, `Trip cannot exceed ${MAX_TRIP_DAYS} days`),
  budget: z
    .number({ error: 'Budget is required' })
    .positive('Budget must be greater than 0'),
  currency: z.string().min(1, 'Please select a currency'),
  travel_month: z.string().min(1, 'Please select a travel month'),
  travel_style: z.string().min(1, 'Please select a travel style'),
  travel_group: z.string().min(1, "Please select who's traveling"),
  hotel_cost: z.number().nonnegative().optional(),
  food_cost: z.number().nonnegative().optional(),
  transport_cost: z.number().nonnegative().optional(),
  miscellaneous_cost: z.number().nonnegative().optional(),
});

export type TripFormData = z.infer<typeof tripFormSchema>;

export interface CreateTripRequest {
  destination: string;
  country: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  days: number;
  budget: number;
  currency: string;
  travel_month: string;
  travel_style: string;
  travel_group: string;
  hotel_cost?: number;
  food_cost?: number;
  transport_cost?: number;
  miscellaneous_cost?: number;
}

/**
 * A saved trip.
 *
 * ⚠️ Rows created before the earlier column migration have `country`,
 * `travel_month`, `travel_style`, `latitude` and `longitude` as SQL NULL, even
 * though they are typed non-optional here. Anything that iterates over the full
 * list (the history browser) must go through the null-safe helpers below rather
 * than dereferencing those fields directly.
 */
export interface Trip {
  id: number;
  /** Owner. Set by the API from the auth token, never from the request body. */
  user_id: number;
  destination: string;
  country: string;
  /** ISO 3166-1 alpha-2, lowercase. Null on rows predating the column. */
  country_code: string | null;
  /** ISO 8601. Null on rows predating the column — render nothing, not "now". */
  created_at: string | null;
  latitude: number;
  longitude: number;
  days: number;
  budget: number;
  currency: string;
  travel_month: string;
  travel_style: string;
  /**
   * Who's traveling (solo/couple/family) — independent from `travel_style`.
   * Null on rows predating this column, including ones that used to store
   * "solo"/"couple"/"family" directly in `travel_style` before it was split out.
   */
  travel_group: string | null;
  category: string;
  daily_budget: number;
  hotel_cost: number | null;
  food_cost: number | null;
  transport_cost: number | null;
  miscellaneous_cost: number | null;
  ai_recommendation: StructuredRecommendation | null;
  /**
   * Destination photo, sourced from Pixabay when the trip was created.
   *
   * A backend-relative path (`/api/v1/trips/{id}/image`), not an absolute URL —
   * pass it through `resolveApiUrl` before putting it in an `<img src>`. Null
   * when the lookup found nothing or the feature is unconfigured, so every
   * consumer must handle its absence. Pixabay requires the contributor credit
   * to be shown wherever the image is: render `image_credit_name` linking to
   * `image_credit_url` alongside it.
   */
  image_url: string | null;
  image_credit_name: string | null;
  image_credit_url: string | null;
}

/**
 * Hydrate the travel form from a saved trip, for the edit-and-regenerate flow.
 * The API returns `null` for unset costs, but the form treats them as absent.
 */
export function tripToFormData(trip: Trip): TripFormData {
  return {
    destination: trip.destination,
    country: trip.country,
    country_code: trip.country_code ?? undefined,
    latitude: trip.latitude,
    longitude: trip.longitude,
    days: trip.days,
    budget: trip.budget,
    currency: trip.currency,
    travel_month: trip.travel_month,
    travel_style: trip.travel_style,
    travel_group: trip.travel_group ?? '',
    hotel_cost: trip.hotel_cost ?? undefined,
    food_cost: trip.food_cost ?? undefined,
    transport_cost: trip.transport_cost ?? undefined,
    miscellaneous_cost: trip.miscellaneous_cost ?? undefined,
  };
}

/**
 * Rebuild the map's selected-location marker from a saved trip.
 * Note the field rename: a trip's `destination` is the location's `name`.
 */
export function tripToSelectedLocation(trip: Trip): SelectedLocation {
  return {
    latitude: trip.latitude,
    longitude: trip.longitude,
    name: trip.destination,
    country: trip.country,
    country_code: trip.country_code ?? undefined,
  };
}

/**
 * The haystack a trip is searched against: destination, country, travel style.
 *
 * Centralised so the NULL-tolerance described on `Trip` lives in exactly one
 * place — a legacy row would otherwise throw on `trip.country.toLowerCase()`.
 */
export function tripSearchText(trip: Trip): string {
  return [trip.destination, trip.country, trip.travel_style, trip.travel_group]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Milliseconds for sorting. Rows with no timestamp fall back to id ordering. */
export function tripCreatedAtMs(trip: Trip): number | null {
  if (!trip.created_at) return null;
  const ms = Date.parse(trip.created_at);
  return Number.isNaN(ms) ? null : ms;
}
