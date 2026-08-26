'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export function Card({ children, className, hoverable, selected, onClick, ariaLabel }: CardProps) {
  const interactive = Boolean(onClick);

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-2xl border bg-white p-4 sm:p-6 shadow-sm transition-all duration-200',
        interactive && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]',
        hoverable && 'hover:shadow-md hover:-translate-y-0.5',
        selected ? 'border-2' : 'border-gray-200',
        className
      )}
      style={selected ? { borderColor: 'var(--brand-primary)' } : undefined}
    >
      {children}
    </div>
  );
}
