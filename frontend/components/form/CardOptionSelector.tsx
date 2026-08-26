'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/lib/utils/cn';

export interface CardOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Optional line under the description, e.g. a budget range. */
  meta?: string;
}

export interface CardOptionSelectorProps {
  legend: string;
  options: CardOption[];
  icons: Record<string, LucideIcon>;
  fallbackIcon: LucideIcon;
  value: string;
  onChange: (id: string) => void;
  error?: string;
  testIdPrefix: string;
  className?: string;
}

/**
 * Single-select grid of icon cards, shared by TravelStyleSelector and
 * TravelGroupSelector — they are two independent axes (trip pace/budget vs.
 * who's traveling) but render identically.
 */
export function CardOptionSelector({
  legend,
  options,
  icons,
  fallbackIcon: FallbackIcon,
  value,
  onChange,
  error,
  testIdPrefix,
  className,
}: CardOptionSelectorProps) {
  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
      <legend className="text-sm font-medium text-gray-800 mb-1">
        {legend}
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
        {options.map((option) => {
          const Icon = icons[option.icon] || FallbackIcon;
          const selected = value === option.id;
          return (
            <Card
              key={option.id}
              selected={selected}
              hoverable
              onClick={() => onChange(option.id)}
              ariaLabel={`${option.name}: ${option.description}`}
              className="p-4"
            >
              <div
                role="radio"
                aria-checked={selected}
                data-testid={`${testIdPrefix}-${option.id}`}
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
                <span className="font-semibold text-gray-900">{option.name}</span>
                <p className="text-sm text-gray-500">{option.description}</p>
                {option.meta && (
                  <span className="text-xs font-medium" style={{ color: 'var(--brand-primary)' }}>
                    {option.meta}
                  </span>
                )}
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
