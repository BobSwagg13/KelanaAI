'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  TreePine,
  Utensils,
  Waves,
  Users,
  UsersRound,
  Mountain,
  Landmark,
  User,
  Heart,
  Globe,
  CalendarDays,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { getTravelStyle } from '@/lib/constants/travelStyles';
import { getTravelGroup } from '@/lib/constants/travelGroups';
import { formatBudget } from '@/lib/utils/budget';
import { countryCodeToFlag } from '@/lib/utils/country';
import { capitalize } from '@/lib/utils/text';
import { resolveApiUrl } from '@/lib/api/client';
import type { Trip } from '@/lib/types/trip';
import { cn } from '@/lib/utils/cn';

const ICONS: Record<string, LucideIcon> = {
  Camera,
  TreePine,
  Utensils,
  Waves,
  Users,
  UsersRound,
  Mountain,
  Landmark,
  User,
  Heart,
};

/**
 * Budget tiers as computed by the backend's `get_trip_category`
 * (Backpacker <= 700 < Standard <= 2000 < Luxury). Keyed lowercase so an
 * unexpected casing still matches.
 */
const CATEGORY_STYLES: Record<string, string> = {
  backpacker: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  standard: 'bg-blue-50 text-blue-700 ring-blue-200',
  luxury: 'bg-amber-50 text-amber-800 ring-amber-200',
};

const NEUTRAL_BADGE = 'bg-slate-100 text-slate-600 ring-slate-200';

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        className
      )}
    >
      {children}
    </span>
  );
}

export interface TripCardProps {
  trip: Trip;
  /** Omit to render a card with no delete affordance. */
  onDelete?: (id: number) => void;
  /** A delete for this trip is in flight. */
  deleting?: boolean;
}

/**
 * Summary card linking to a trip's detail page.
 *
 * Every field is read defensively: rows created before the schema migration
 * have NULL `country` / `travel_style` / `country_code` despite the `Trip` type
 * declaring them required.
 */
export function TripCard({ trip, onDelete, deleting }: TripCardProps) {
  const [confirming, setConfirming] = useState(false);
  const style = getTravelStyle(trip.travel_style);
  const StyleIcon = style ? ICONS[style.icon] : undefined;
  const group = getTravelGroup(trip.travel_group);
  const GroupIcon = group ? ICONS[group.icon] : undefined;
  const flag = countryCodeToFlag(trip.country_code);
  const categoryClass = CATEGORY_STYLES[trip.category?.toLowerCase() ?? ''] ?? NEUTRAL_BADGE;

  const createdAt = trip.created_at ? new Date(trip.created_at) : null;
  const createdLabel =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

  return (
    // The delete control is a sibling of the link, not a child: a button inside
    // an anchor is invalid, and nesting it would also make every delete click
    // navigate to the trip.
    <div className="relative h-full">
      {onDelete && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
          {confirming ? (
            <>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  onDelete(trip.id);
                  setConfirming(false);
                }}
                data-testid={`trip-delete-confirm-${trip.id}`}
                className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-red-600 shadow-sm backdrop-blur transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-muted shadow-sm backdrop-blur transition-colors hover:text-brand-ink"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirming(true)}
              aria-label={`Delete trip to ${trip.destination}`}
              data-testid={`trip-delete-${trip.id}`}
              className="rounded-full bg-white/90 p-1.5 text-brand-muted shadow-sm backdrop-blur transition-colors hover:text-red-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      <Link
        href={`/trips/${trip.id}`}
        data-testid={`trip-card-${trip.id}`}
        className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
      >
        <Card hoverable className={cn('h-full flex flex-col gap-3 overflow-hidden', deleting && 'opacity-50')}>
        {trip.image_url && (
          <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-1 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element --
                served by our own API, whose host is runtime config
                (NEXT_PUBLIC_API_URL) and so cannot be declared in
                next.config's build-time remotePatterns. */}
            <img
              src={resolveApiUrl(trip.image_url)}
              alt=""
              loading="lazy"
              className="h-32 w-full object-cover"
            />
          </div>
        )}

        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none" aria-hidden={flag ? undefined : true}>
            {flag ?? <Globe size={28} className="text-brand-muted" aria-hidden="true" />}
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold tracking-tight text-brand-ink truncate">
              {trip.destination}
            </h3>
            <p className="text-sm text-brand-muted truncate">
              {trip.country ?? 'Unknown country'}
              {trip.travel_month ? ` · ${capitalize(trip.travel_month)}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={categoryClass}>{trip.category ?? 'Uncategorised'}</Badge>
          {style && (
            <Badge className="bg-brand-surface-subtle text-brand-primary ring-brand-border">
              {StyleIcon && <StyleIcon size={12} aria-hidden="true" />}
              {style.name}
            </Badge>
          )}
          {group && (
            <Badge className="bg-violet-50 text-violet-700 ring-violet-200">
              {GroupIcon && <GroupIcon size={12} aria-hidden="true" />}
              {group.name}
            </Badge>
          )}
          {!trip.ai_recommendation && (
            <Badge className={NEUTRAL_BADGE}>
              <Sparkles size={12} aria-hidden="true" />
              No itinerary
            </Badge>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div>
            <p className="font-display text-xl font-bold text-brand-ink">
              {formatBudget(trip.budget, trip.currency)}
            </p>
            <p className="text-xs text-brand-muted">
              {trip.days} {trip.days === 1 ? 'day' : 'days'}
            </p>
          </div>

          {createdLabel && (
            <span className="inline-flex items-center gap-1 text-xs text-brand-muted">
              <CalendarDays size={12} aria-hidden="true" />
              {createdLabel}
            </span>
          )}
        </div>
        </Card>
      </Link>
    </div>
  );
}
