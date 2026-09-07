'use client';

import {
  Camera,
  Landmark,
  Mountain,
  TreePine,
  Utensils,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { CardOptionSelector } from './CardOptionSelector';
import { TRAVEL_STYLES } from '@/lib/constants/travelStyles';

export interface TravelStyleSelectorProps {
  value: string;
  onChange: (style: string) => void;
  error?: string;
  className?: string;
}

const ICONS: Record<string, LucideIcon> = {
  Camera,
  Landmark,
  Mountain,
  TreePine,
  Utensils,
  Waves,
};

/** What the traveller wants to do. See TravelGroupSelector for who's going. */
export function TravelStyleSelector({ value, onChange, error, className }: TravelStyleSelectorProps) {
  return (
    <CardOptionSelector
      legend="Travel Style"
      options={TRAVEL_STYLES}
      icons={ICONS}
      fallbackIcon={Landmark}
      value={value}
      onChange={onChange}
      error={error}
      testIdPrefix="travel-style"
      className={className}
    />
  );
}
