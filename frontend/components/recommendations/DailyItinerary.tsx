'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Landmark,
  Utensils,
  Palette,
  Mountain,
  Waves,
  ShoppingBag,
  Clock,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import type { DailyItinerary as DailyItineraryType, Activity, ActivityCategory } from '@/lib/types/recommendation';
import { formatCurrency } from '@/lib/utils/budget';
import { cn } from '@/lib/utils/cn';

export interface DailyItineraryProps {
  itinerary: DailyItineraryType[];
  currency: string;
}

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  sightseeing: Landmark,
  food: Utensils,
  culture: Palette,
  adventure: Mountain,
  relaxation: Waves,
  shopping: ShoppingBag,
};

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = CATEGORY_ICONS[activity.category] || Landmark;
  return (
    <li className="flex gap-3 py-2">
      <Icon size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium text-gray-900">
          {activity.time && <span className="text-gray-400 font-normal mr-2">{activity.time}</span>}
          {activity.name}
        </p>
        <p className="text-sm text-gray-600">{activity.description}</p>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
          {activity.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} aria-hidden="true" /> {activity.location}
            </span>
          )}
          {activity.duration && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} aria-hidden="true" /> {activity.duration}
            </span>
          )}
          {typeof activity.estimated_cost === 'number' && (
            <span>{formatCurrency(activity.estimated_cost, '')}</span>
          )}
        </div>
      </div>
    </li>
  );
}

function TimeBlock({ label, activities }: { label: string; activities: Activity[] }) {
  if (!activities?.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</h4>
      <ul className="divide-y divide-gray-100">
        {activities.map((activity, i) => (
          <ActivityItem key={i} activity={activity} />
        ))}
      </ul>
    </div>
  );
}

export function DailyItinerary({ itinerary, currency }: DailyItineraryProps) {
  const [openDay, setOpenDay] = useState<number | null>(itinerary[0]?.day ?? null);

  if (!itinerary?.length) {
    return <p className="text-gray-500">No itinerary available.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {itinerary.map((day) => {
        const isOpen = openDay === day.day;
        return (
          <div key={day.day} className="rounded-2xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenDay(isOpen ? null : day.day)}
              aria-expanded={isOpen}
              aria-controls={`day-${day.day}-panel`}
              className="flex w-full items-center justify-between px-4 py-3.5 sm:px-6 text-left"
              style={{ background: 'var(--brand-card-gradient)' }}
            >
              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--brand-primary)' }}>
                  Day {day.day}
                  {day.date ? ` · ${day.date}` : ''}
                </span>
                <p className="font-semibold text-gray-900">{day.theme}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-gray-500 hidden sm:inline">
                  {formatCurrency(day.estimated_daily_cost, currency)}
                </span>
                <ChevronDown size={18} className={cn('transition-transform', isOpen && 'rotate-180')} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`day-${day.day}-panel`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 sm:px-6 pb-4 flex flex-col gap-4 border-t border-gray-100 pt-3">
                    <TimeBlock label="Morning" activities={day.morning} />
                    <TimeBlock label="Afternoon" activities={day.afternoon} />
                    <TimeBlock label="Evening" activities={day.evening} />
                    <p className="text-sm font-medium sm:hidden">
                      Estimated cost: {formatCurrency(day.estimated_daily_cost, currency)}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
