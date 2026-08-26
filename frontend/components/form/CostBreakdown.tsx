'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { calculateCostBreakdownTotal, formatCurrency, type CostBreakdownData } from '@/lib/utils/budget';
import { cn } from '@/lib/utils/cn';

export interface CostBreakdownProps {
  budget: number;
  currency: string;
  costs: CostBreakdownData;
  onChange: (costs: CostBreakdownData) => void;
  className?: string;
}

const FIELDS: { key: keyof CostBreakdownData; label: string }[] = [
  { key: 'hotel_cost', label: 'Hotel' },
  { key: 'food_cost', label: 'Food' },
  { key: 'transport_cost', label: 'Transport' },
  { key: 'miscellaneous_cost', label: 'Miscellaneous' },
];

export function CostBreakdown({ budget, currency, costs, onChange, className }: CostBreakdownProps) {
  const [open, setOpen] = useState(false);
  const total = calculateCostBreakdownTotal(costs);
  const exceedsBudget = budget > 0 && total > budget;

  const handleFieldChange = (key: keyof CostBreakdownData, raw: string) => {
    const value = raw === '' ? undefined : Number(raw);
    onChange({ ...costs, [key]: value });
  };

  return (
    <div className={cn('rounded-2xl border border-gray-200 overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="cost-breakdown-panel"
        className="flex w-full items-center justify-between px-4 py-3.5 sm:px-6 bg-gray-50 text-left"
      >
        <span className="font-medium text-gray-900">Detailed Cost Breakdown (optional)</span>
        <ChevronDown
          size={18}
          className={cn('transition-transform', open && 'rotate-180')}
          style={{ color: 'var(--brand-primary)' }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="cost-breakdown-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-6 flex flex-col gap-4">
              {FIELDS.map(({ key, label }) => {
                const value = costs[key] || 0;
                const percent = total > 0 ? (value / total) * 100 : 0;
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor={`cost-${key}`} className="text-sm font-medium text-gray-700">
                        {label}
                      </label>
                      <input
                        id={`cost-${key}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={costs[key] ?? ''}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="w-28 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                        aria-label={`${label} cost in ${currency}`}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, percent)}%`,
                          background: 'var(--brand-primary)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between border-t border-gray-200 pt-3 font-semibold">
                <span>Total</span>
                <span style={{ color: exceedsBudget ? '#DC2626' : 'var(--brand-primary)' }}>
                  {formatCurrency(total, currency)}
                </span>
              </div>

              {exceedsBudget && (
                <div role="alert" className="flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span>
                    Total exceeds your budget of {formatCurrency(budget, currency)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
