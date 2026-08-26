'use client';

import React from 'react';
import type { BudgetBreakdown } from '@/lib/types/recommendation';
import { formatCurrency } from '@/lib/utils/budget';

export interface BudgetVisualizationProps {
  breakdown: BudgetBreakdown;
  currency: string;
}

const CATEGORIES: { key: keyof BudgetBreakdown; label: string; color: string }[] = [
  { key: 'accommodation', label: 'Accommodation', color: 'var(--brand-primary)' },
  { key: 'food', label: 'Food', color: 'var(--brand-accent)' },
  { key: 'transportation', label: 'Transportation', color: 'var(--brand-accent-soft)' },
  { key: 'activities', label: 'Activities', color: 'var(--brand-muted)' },
  { key: 'miscellaneous', label: 'Miscellaneous', color: '#9CA3AF' },
];

export function BudgetVisualization({ breakdown, currency }: BudgetVisualizationProps) {
  const total = breakdown.total || 1;

  return (
    <div>
      <div className="flex flex-col gap-4" role="img" aria-label="Budget breakdown chart">
        {CATEGORIES.map(({ key, label, color }) => {
          const value = (breakdown[key] as number) || 0;
          const percent = (value / total) * 100;
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-500">
                  {formatCurrency(value, currency)} · {percent.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, percent)}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 font-semibold text-gray-900">
        <span>Total</span>
        <span>{formatCurrency(breakdown.total, currency)}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Daily average: {formatCurrency(breakdown.daily_average, currency)}
      </p>

      <table className="sr-only">
        <caption>Budget breakdown by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Amount</th>
            <th scope="col">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(({ key, label }) => {
            const value = (breakdown[key] as number) || 0;
            return (
              <tr key={key}>
                <td>{label}</td>
                <td>{formatCurrency(value, currency)}</td>
                <td>{((value / total) * 100).toFixed(0)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
