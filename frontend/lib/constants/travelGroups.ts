export interface TravelGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/**
 * Who's traveling. Independent from `TRAVEL_STYLES` (what you want to do) —
 * a family can be after adventure, a solo traveller can be after food, etc.
 */
export const TRAVEL_GROUPS: TravelGroup[] = [
  {
    id: 'solo',
    name: 'Solo',
    description: 'Flexible, self-paced travel built around your own interests',
    icon: 'User',
  },
  {
    id: 'couple',
    name: 'Couple',
    description: 'Romantic stays, scenic views, and dining for two',
    icon: 'Heart',
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Family-friendly activities and pacing, comfort in mind',
    icon: 'Users',
  },
  {
    id: 'friends',
    name: 'Friends',
    description: 'Group-friendly venues, shared plans, and livelier evenings',
    icon: 'UsersRound',
  },
];

/** Look up a group by its stored id. Returns undefined for unknown/legacy ids. */
export function getTravelGroup(id: string | null | undefined): TravelGroup | undefined {
  if (!id) return undefined;
  return TRAVEL_GROUPS.find((group) => group.id === id);
}
