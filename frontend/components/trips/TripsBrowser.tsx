'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, SearchX, MapPinned, ChevronLeft, ChevronRight } from 'lucide-react';
import { tripsApi } from '@/lib/api/trips';
import { tripKeys } from '@/lib/queries/keys';
import { createAppError } from '@/lib/types/errors';
import { tripCreatedAtMs, tripSearchText, type Trip } from '@/lib/types/trip';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { Button } from '@/components/shared/Button';
import { TripCard } from './TripCard';

export type SortOrder = 'latest' | 'oldest' | 'budget';

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'latest', label: 'Latest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'budget', label: 'Highest budget' },
];

const PAGE_SIZE = 10;

/**
 * Order two trips by recency.
 *
 * `created_at` is null on rows predating the column, so `id` (a serial PK, hence
 * monotonic with insertion) is the fallback and the tiebreaker. Timestamped rows
 * always sort as newer than untimestamped ones.
 */
function compareRecency(a: Trip, b: Trip): number {
  const aMs = tripCreatedAtMs(a);
  const bMs = tripCreatedAtMs(b);
  if (aMs !== null && bMs !== null && aMs !== bMs) return bMs - aMs;
  if (aMs !== null && bMs === null) return -1;
  if (aMs === null && bMs !== null) return 1;
  return b.id - a.id;
}

export function TripsBrowser() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOrder>('latest');
  const [page, setPage] = useState(1);

  // Cached across navigations, so trips -> detail -> back paints instantly and
  // revalidates in the background instead of showing a spinner every time.
  const {
    data: trips,
    error: queryError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: tripKeys.list(),
    queryFn: tripsApi.listTrips,
  });

  // The axios interceptor already rejects with an AppError; createAppError
  // short-circuits on one, so this just narrows the type.
  const error = queryError ? createAppError(queryError) : null;

  const handleRetry = () => {
    void refetch();
  };

  // Page resets live with the interactions that cause them rather than in an
  // effect, which would be a cascading render.
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleSortChange = (value: SortOrder) => {
    setSort(value);
    setPage(1);
  };

  const visible = useMemo(() => {
    if (!trips) return [];
    const needle = query.trim().toLowerCase();

    const filtered = needle
      ? trips.filter((trip) => tripSearchText(trip).includes(needle))
      : [...trips];

    return filtered.sort((a, b) => {
      if (sort === 'budget') return (b.budget ?? 0) - (a.budget ?? 0);
      if (sort === 'oldest') return -compareRecency(a, b);
      return compareRecency(a, b);
    });
  }, [trips, query, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRetry} />;
  }

  if (isLoading || !trips) {
    return <LoadingState stage="loading" message="Loading your trips..." />;
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-brand-border bg-white py-16 text-center">
        <MapPinned size={40} style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
        <div>
          <p className="font-display text-xl font-bold text-brand-ink">No trips yet</p>
          <p className="mt-1 text-sm text-brand-muted">
            Plan your first trip and it will show up here.
          </p>
        </div>
        <Link href="/">
          <Button>Plan a trip</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search destination or travel style..."
            aria-label="Search trips by destination or travel style"
            data-testid="trip-search"
            className="w-full rounded-lg border border-brand-border py-2.5 pl-9 pr-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="trip-sort" className="text-sm font-medium text-brand-muted">
            Sort
          </label>
          <select
            id="trip-sort"
            value={sort}
            onChange={(e) => handleSortChange(e.target.value as SortOrder)}
            data-testid="trip-sort"
            className="rounded-lg border border-brand-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-brand-muted" aria-live="polite" data-testid="trip-count">
        {visible.length} {visible.length === 1 ? 'trip' : 'trips'}
        {query.trim() ? ` matching “${query.trim()}”` : ''}
      </p>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-border bg-white py-14 text-center">
          <SearchX size={36} className="text-brand-muted" aria-hidden="true" />
          <div>
            <p className="font-display text-lg font-bold text-brand-ink">No matching trips</p>
            <p className="mt-1 text-sm text-brand-muted">
              Nothing matches “{query.trim()}”. Try a different destination or style.
            </p>
          </div>
          <Button variant="outline" onClick={() => handleQueryChange('')}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-4 pt-2" aria-label="Pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} /> Previous
          </Button>
          <span className="text-sm font-medium text-brand-muted" aria-live="polite">
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next <ChevronRight size={14} />
          </Button>
        </nav>
      )}
    </div>
  );
}
