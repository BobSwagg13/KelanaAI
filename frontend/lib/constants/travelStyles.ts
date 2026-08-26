export interface TravelStyle {
  id: string;
  name: string;
  description: string;
  icon: string;
  budgetRange: string;
}

export const TRAVEL_STYLES: TravelStyle[] = [
  {
    id: 'backpacker',
    name: 'Backpacker',
    description: 'Hostels, local transport, and budget-friendly experiences',
    icon: 'Backpack',
    budgetRange: 'Under $700',
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Mid-range hotels with a balanced mix of experiences',
    icon: 'Building2',
    budgetRange: '$700 - $2,000',
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Family-friendly activities with comfort in mind',
    icon: 'Users',
    budgetRange: '$1,000 - $3,000',
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'High-end hotels and premium, curated experiences',
    icon: 'Gem',
    budgetRange: '$2,000+',
  },
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Outdoor activities, hiking, and adrenaline-fueled sports',
    icon: 'Mountain',
    budgetRange: '$800 - $2,500',
  },
  {
    id: 'cultural',
    name: 'Cultural',
    description: 'Museums, historical sites, and local traditions',
    icon: 'Landmark',
    budgetRange: '$700 - $2,000',
  },
];
