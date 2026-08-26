'use client';

import React from 'react';
import { Shield, Globe, DollarSign, Bus, Info, type LucideIcon } from 'lucide-react';
import type { TravelTip, TravelTipCategory } from '@/lib/types/recommendation';
import { Card } from '@/components/shared/Card';

export interface TravelTipsProps {
  tips: TravelTip[];
}

const CATEGORY_ICONS: Record<TravelTipCategory, LucideIcon> = {
  safety: Shield,
  culture: Globe,
  money: DollarSign,
  transportation: Bus,
  general: Info,
};

export function TravelTips({ tips }: TravelTipsProps) {
  if (!tips?.length) {
    return <p className="text-gray-500">No travel tips available.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {tips.map((tip, i) => {
        const Icon = CATEGORY_ICONS[tip.category] || Info;
        return (
          <Card key={i} hoverable className="flex gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'var(--brand-surface-subtle)' }}
            >
              <Icon size={18} style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{tip.title}</p>
              <p className="text-sm text-gray-600 mt-0.5">{tip.description}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
