'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/lib/utils/cn';

export interface CardOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Optional line under the description. */
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
 * Single-select row of icon cards, shared by TravelStyleSelector and
 * TravelGroupSelector — two independent axes (what you want to do vs. who's
 * going) that render identically.
 *
 * A single scrolling row rather than a wrapping grid: with six styles the grid
 * spilled onto a second row and pushed the rest of the form down. Scrolling is
 * native (touch, trackpad and shift-wheel all work); the arrows are an
 * affordance on top of it, and hide when there is nothing to scroll.
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const syncArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // A pixel of slack: fractional widths make an exact comparison flicker.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncArrows();
    const observer = new ResizeObserver(syncArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncArrows, options.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // Roughly a card and a half, so the next one is already partly visible.
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  const scrollable = !(atStart && atEnd);

  const arrowClass =
    'absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-brand-border bg-white p-1.5 shadow-md transition-colors hover:text-brand-primary disabled:pointer-events-none disabled:opacity-0 sm:block';

  return (
    <fieldset className={cn('flex w-full min-w-0 flex-col gap-2', className)}>
      <legend className="text-sm font-medium text-gray-800 mb-1">
        {legend}
        <span className="ml-0.5 text-red-500" aria-hidden="true">
          *
        </span>
      </legend>

      <div className="relative min-w-0">
        {scrollable && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            disabled={atStart}
            onClick={() => scrollBy(-1)}
            className={cn(arrowClass, '-left-3')}
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div
          ref={trackRef}
          onScroll={syncArrows}
          role="radiogroup"
          aria-required="true"
          aria-invalid={Boolean(error)}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                className="w-56 shrink-0 snap-start p-4"
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

        {scrollable && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            disabled={atEnd}
            onClick={() => scrollBy(1)}
            className={cn(arrowClass, '-right-3')}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
