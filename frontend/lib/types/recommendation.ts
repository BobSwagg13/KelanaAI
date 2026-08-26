export interface StructuredRecommendation {
  trip_overview: {
    destination: string;
    country: string;
    duration: number;
    category: string;
    daily_budget: number;
    travel_month: string;
  };
  daily_itinerary: DailyItinerary[];
  travel_tips: TravelTip[];
  local_food: FoodRecommendation[];
  budget_breakdown: BudgetBreakdown;
  transportation: TransportationInfo;
}

export type ActivityCategory =
  | 'sightseeing'
  | 'food'
  | 'culture'
  | 'adventure'
  | 'relaxation'
  | 'shopping';

export interface Activity {
  time?: string;
  name: string;
  description: string;
  location?: string;
  estimated_cost?: number;
  duration?: string;
  category: ActivityCategory;
}

export interface DailyItinerary {
  day: number;
  date?: string;
  theme: string;
  morning: Activity[];
  afternoon: Activity[];
  evening: Activity[];
  estimated_daily_cost: number;
}

export type TravelTipCategory = 'safety' | 'culture' | 'money' | 'transportation' | 'general';

export interface TravelTip {
  category: TravelTipCategory;
  title: string;
  description: string;
}

export interface FoodRecommendation {
  name: string;
  description: string;
  type: 'restaurant' | 'street_food' | 'market' | 'cafe';
  estimated_cost: number;
  location?: string;
  must_try_dishes: string[];
}

export interface BudgetBreakdown {
  accommodation: number;
  food: number;
  transportation: number;
  activities: number;
  miscellaneous: number;
  total: number;
  daily_average: number;
}

export interface TransportationInfo {
  getting_there: string[];
  getting_around: string[];
  estimated_costs: Record<string, number>;
}
