export interface TravelStyle {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/**
 * What the traveller wants to DO. Purely an interest axis.
 *
 * It deliberately says nothing about spend: the backend already derives a
 * budget tier (`category`) from the budget figure, so offering "Backpacker /
 * Standard / Luxury" here duplicated that — and let a trip claim to be Luxury
 * on a $500 budget. Those three ids are gone; `getTravelStyle` returns
 * undefined for them and the UI simply omits the badge on older trips.
 *
 * These map onto the activity categories the itinerary prompt uses, so a style
 * translates directly into the kind of days that get generated.
 */
export const TRAVEL_STYLES: TravelStyle[] = [
  {
    id: 'sightseeing',
    name: 'Sightseeing',
    description: 'The landmarks and views the city is known for',
    icon: 'Camera',
  },
  {
    id: 'cultural',
    name: 'Cultural',
    description: 'Museums, historical sites, and local traditions',
    icon: 'Landmark',
  },
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Hiking, water sports, and adrenaline-fuelled days',
    icon: 'Mountain',
  },
  {
    id: 'nature',
    name: 'Nature & Outdoors',
    description: 'Parks, wildlife, gardens, and scenic countryside',
    icon: 'TreePine',
  },
  {
    id: 'food',
    name: 'Food & Drink',
    description: 'Markets, street food, cooking classes, and standout meals',
    icon: 'Utensils',
  },
  {
    id: 'relaxed',
    name: 'Relaxed',
    description: 'An unhurried pace with time to sit still and wander',
    icon: 'Waves',
  },
];

/** Look up a style by its stored id. Returns undefined for unknown/legacy ids. */
export function getTravelStyle(id: string | null | undefined): TravelStyle | undefined {
  if (!id) return undefined;
  return TRAVEL_STYLES.find((style) => style.id === id);
}
