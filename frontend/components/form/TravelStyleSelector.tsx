'use client';

import { Backpack, Building2, Gem, Mountain, Landmark, type LucideIcon } from 'lucide-react';
import { CardOptionSelector } from './CardOptionSelector';
import { TRAVEL_STYLES } from '@/lib/constants/travelStyles';

export interface TravelStyleSelectorProps {
  value: string;
  onChange: (style: string) => void;
  error?: string;
  className?: string;
}

const ICONS: Record<string, LucideIcon> = {
  Backpack,
  Building2,
  Gem,
  Mountain,
  Landmark,
};

/** Trip pace and budget style. See TravelGroupSelector for who's traveling. */
export function TravelStyleSelector({ value, onChange, error, className }: TravelStyleSelectorProps) {
  return (
    <CardOptionSelector
      legend="Travel Style"
      options={TRAVEL_STYLES.map((style) => ({ ...style, meta: style.budgetRange }))}
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
