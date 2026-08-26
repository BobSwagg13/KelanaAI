'use client';

import { User, Heart, Users, type LucideIcon } from 'lucide-react';
import { CardOptionSelector } from './CardOptionSelector';
import { TRAVEL_GROUPS } from '@/lib/constants/travelGroups';

export interface TravelGroupSelectorProps {
  value: string;
  onChange: (group: string) => void;
  error?: string;
  className?: string;
}

const ICONS: Record<string, LucideIcon> = {
  User,
  Heart,
  Users,
};

/** Who's traveling. Independent from TravelStyleSelector's pace/budget axis. */
export function TravelGroupSelector({ value, onChange, error, className }: TravelGroupSelectorProps) {
  return (
    <CardOptionSelector
      legend="Who's Traveling"
      options={TRAVEL_GROUPS}
      icons={ICONS}
      fallbackIcon={Users}
      value={value}
      onChange={onChange}
      error={error}
      testIdPrefix="travel-group"
      className={className}
    />
  );
}
