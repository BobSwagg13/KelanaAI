'use client';

import React from 'react';
import {
  Backpack,
  Building2,
  Users,
  Gem,
  Mountain,
  Landmark,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { TRAVEL_STYLES } from '@/lib/constants/travelStyles';
import { cn } from '@/lib/utils/cn';

export interface TravelStyleSelectorProps {
  value: string;
  onChange: (style: string) => void;
  error?: string;
  className?: string;
}

const ICONS: Record<string, LucideIcon> = {
  Backpack,
  Building2,
  Users,
  Gem,
  Mountain,
  Landmark,
};

export function TravelStyleSelector({ value, onChange, error, className }: TravelStyleSelectorProps) {
  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
      <legend className="text-sm font-medium text-gray-800 mb-1">
        Travel Style
        <span className="ml-0.5 text-red-500" aria-hidden="true">
          *
        </span>
      </legend>
      <div
        role="radiogroup"
        aria-required="true"
        aria-invalid={Boolean(error)}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        {TRAVEL_STYLES.map((style) => {
          const Icon = ICONS[style.icon] || Landmark;
          const selected = value === style.id;
          return (
            <Card
              key={style.id}
              selected={selected}
              hoverable
              onClick={() => onChange(style.id)}
              ariaLabel={`${style.name}: ${style.description}`}
              className="p-4"
            >
              <div
                role="radio"
                aria-checked={selected}
                data-testid={`travel-style-${style.id}`}
                className="flex flex-col gap-2"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: selected
                      ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))'
                      : '#F3F4F6',
                  }}
                >
                  <Icon size={20} className={selected ? 'text-white' : 'text-gray-600'} />
                </div>
                <span className="font-semibold text-gray-900">{style.name}</span>
                <p className="text-sm text-gray-500">{style.description}</p>
                <span className="text-xs font-medium" style={{ color: 'var(--brand-primary)' }}>
                  {style.budgetRange}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
