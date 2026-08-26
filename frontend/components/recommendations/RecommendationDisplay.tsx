'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, Plane, Car, RotateCcw, Plus } from 'lucide-react';
import type { StructuredRecommendation } from '@/lib/types/recommendation';
import type { Trip } from '@/lib/types/trip';
import { formatCurrency } from '@/lib/utils/budget';
import { DailyItinerary } from './DailyItinerary';
import { BudgetVisualization } from './BudgetVisualization';
import { TravelTips } from './TravelTips';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';

export interface RecommendationDisplayProps {
  recommendation: StructuredRecommendation;
  trip: Trip;
  onNewTrip: () => void;
  /** Regenerates the itinerary for this same trip. Does not create a new trip. */
  onRegenerate: () => void;
}

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function Section({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={fadeIn}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col gap-4"
    >
      <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-brand-ink">
        {title}
      </h3>
      {children}
    </motion.section>
  );
}

export function RecommendationDisplay({
  recommendation,
  trip,
  onNewTrip,
  onRegenerate,
}: RecommendationDisplayProps) {
  const { trip_overview, daily_itinerary, travel_tips, local_food, budget_breakdown, transportation } =
    recommendation;

  return (
    <div data-testid="recommendation-display" className="flex flex-col gap-10 max-w-4xl mx-auto w-full">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{ duration: 0.5 }}
        className="rounded-2xl p-6 sm:p-8 text-white shadow-lg"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <p className="text-sm font-semibold uppercase tracking-widest opacity-80">
          {trip_overview.travel_month} · {trip_overview.category}
        </p>
        <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mt-2">
          {trip_overview.destination}, {trip_overview.country}
        </h2>
        <div className="mt-5 flex flex-wrap gap-6 text-sm font-medium">
          <span>{trip_overview.duration} days</span>
          <span>{formatCurrency(trip_overview.daily_budget, trip.currency)} / day</span>
          <span>{formatCurrency(trip.budget, trip.currency)} total</span>
        </div>
      </motion.div>

      <Section title="Daily Itinerary">
        <DailyItinerary itinerary={daily_itinerary} currency={trip.currency} />
      </Section>

      <Section title="Budget Breakdown" delay={0.05}>
        <Card>
          <BudgetVisualization breakdown={budget_breakdown} currency={trip.currency} />
        </Card>
      </Section>

      <Section title="Local Food Recommendations" delay={0.1}>
        {local_food?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {local_food.map((food, i) => (
              <Card key={i} hoverable className="flex gap-3">
                <Utensils size={20} className="mt-0.5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                <div>
                  <p className="font-semibold text-gray-900">{food.name}</p>
                  <p className="text-sm text-gray-600">{food.description}</p>
                  {food.location && <p className="text-xs text-gray-400 mt-1">{food.location}</p>}
                  {food.must_try_dishes?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Must try: {food.must_try_dishes.join(', ')}
                    </p>
                  )}
                  <p className="text-xs font-medium mt-1" style={{ color: 'var(--brand-primary)' }}>
                    {formatCurrency(food.estimated_cost, trip.currency)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No food recommendations available.</p>
        )}
      </Section>

      <Section title="Travel Tips" delay={0.15}>
        <TravelTips tips={travel_tips} />
      </Section>

      <Section title="Transportation" delay={0.2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Plane size={18} style={{ color: 'var(--brand-primary)' }} />
              <p className="font-semibold text-gray-900">Getting There</p>
            </div>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              {transportation?.getting_there?.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </Card>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Car size={18} style={{ color: 'var(--brand-primary)' }} />
              <p className="font-semibold text-gray-900">Getting Around</p>
            </div>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              {transportation?.getting_around?.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </Card>
        </div>
      </Section>

      <div className="flex flex-wrap gap-4 justify-center pb-4">
        <Button variant="outline" onClick={onRegenerate} data-testid="regenerate-trip">
          <RotateCcw size={16} /> Regenerate
        </Button>
        <Button onClick={onNewTrip}>
          <Plus size={16} /> New Trip
        </Button>
      </div>
    </div>
  );
}
