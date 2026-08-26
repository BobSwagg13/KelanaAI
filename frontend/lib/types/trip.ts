import { z } from 'zod';
import type { StructuredRecommendation } from './recommendation';

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
}

/**
 * Upper bound on trip length, mirrored by MAX_TRIP_DAYS in the backend.
 * Keeps the generated itinerary inside the model's output token budget.
 */
export const MAX_TRIP_DAYS = 30;

export const tripFormSchema = z.object({
  destination: z.string().min(1, 'Please select a destination on the map'),
  country: z.string().min(1, 'Country is required'),
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
  hotel_cost: z.number().nonnegative().optional(),
  food_cost: z.number().nonnegative().optional(),
  transport_cost: z.number().nonnegative().optional(),
  miscellaneous_cost: z.number().nonnegative().optional(),
});

export type TripFormData = z.infer<typeof tripFormSchema>;

export interface CreateTripRequest {
  destination: string;
  country: string;
  latitude: number;
  longitude: number;
  days: number;
  budget: number;
  currency: string;
  travel_month: string;
  travel_style: string;
  hotel_cost?: number;
  food_cost?: number;
  transport_cost?: number;
  miscellaneous_cost?: number;
}

export interface Trip {
  id: number;
  destination: string;
  country: string;
  latitude: number;
  longitude: number;
  days: number;
  budget: number;
  currency: string;
  travel_month: string;
  travel_style: string;
  category: string;
  daily_budget: number;
  hotel_cost: number | null;
  food_cost: number | null;
  transport_cost: number | null;
  miscellaneous_cost: number | null;
  ai_recommendation: StructuredRecommendation | null;
}

/**
 * Hydrate the travel form from a saved trip, for the edit-and-regenerate flow.
 * The API returns `null` for unset costs, but the form treats them as absent.
 */
export function tripToFormData(trip: Trip): TripFormData {
  return {
    destination: trip.destination,
    country: trip.country,
    latitude: trip.latitude,
    longitude: trip.longitude,
    days: trip.days,
    budget: trip.budget,
    currency: trip.currency,
    travel_month: trip.travel_month,
    travel_style: trip.travel_style,
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
  };
}
