'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api/trips';
import { tripKeys } from '@/lib/queries/keys';
import { createAppError, type AppError } from '@/lib/types/errors';
import type { CreateTripRequest, Trip } from '@/lib/types/trip';
import type { StructuredRecommendation } from '@/lib/types/recommendation';

export type LoadingStage = 'creating' | 'updating' | 'generating' | 'loading';

interface TripContextValue {
  currentTrip: Trip | null;
  recommendation: StructuredRecommendation | null;
  loading: boolean;
  loadingStage: LoadingStage | null;
  error: AppError | null;
  /**
   * First run: create the trip, then generate its recommendation.
   *
   * Resolves with the created trip whenever the POST succeeded — INCLUDING when
   * the follow-up generate failed, because a row exists either way. Returns null
   * only when no row was created. Callers navigate on a non-null result; treating
   * a failed generate as "nothing happened" would strand the row and invite a
   * resubmit, creating a duplicate.
   */
  createTrip: (data: CreateTripRequest) => Promise<Trip | null>;
  /** Load an existing trip by id into this provider. */
  loadTrip: (tripId: number) => Promise<void>;
  /** Edit flow: save new inputs onto the existing trip, then regenerate it. */
  updateAndRegenerate: (data: CreateTripRequest) => Promise<void>;
  /** Regenerate the current trip in place. Never creates a new trip. */
  regenerate: () => Promise<void>;
  /** Re-run whichever operation failed. */
  retry: () => Promise<void>;
  resetTrip: () => void;
  dismissError: () => void;
}

const TripContext = createContext<TripContextValue | undefined>(undefined);

export function TripProvider({
  children,
  initialTrip = null,
}: {
  children: React.ReactNode;
  /** Seed state synchronously, e.g. when a page already has the trip. */
  initialTrip?: Trip | null;
}) {
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(initialTrip);
  const [recommendation, setRecommendation] = useState<StructuredRecommendation | null>(
    initialTrip?.ai_recommendation ?? null
  );
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [lastRequest, setLastRequest] = useState<CreateTripRequest | null>(null);
  const queryClient = useQueryClient();

  /**
   * Runs an async flow with shared loading/error handling so each action below
   * only has to describe its own API calls.
   */
  const run = useCallback(async (fn: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(createAppError(err));
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  }, []);

  const applyTrip = useCallback((trip: Trip) => {
    setCurrentTrip(trip);
    setRecommendation(trip.ai_recommendation);
  }, []);

  /**
   * Apply a trip AND tell the query cache about it.
   *
   * TripsBrowser reads the trips list through React Query with a 60s
   * staleTime, so a trip created here would otherwise not appear under History
   * until that window expired. Seeding the detail entry as well makes opening
   * the trip from the list instant.
   *
   * Only the mutating flows use this — `loadTrip` is a read and has nothing to
   * publish.
   */
  const publishTrip = useCallback(
    (trip: Trip) => {
      applyTrip(trip);
      queryClient.setQueryData(tripKeys.detail(trip.id), trip);

      // Upsert into the cached list so History renders the trip the moment you
      // navigate there. Invalidating alone would still cost a round trip on
      // arrival, which is the delay this fixes. Left untouched when the list
      // has never been fetched, so the first visit does a normal load.
      queryClient.setQueryData<Trip[]>(tripKeys.list(), (prev) =>
        prev ? [trip, ...prev.filter((t) => t.id !== trip.id)] : prev
      );

      // Then revalidate, so the server's ordering is what ultimately wins.
      void queryClient.invalidateQueries({ queryKey: tripKeys.list() });
    },
    [applyTrip, queryClient]
  );

  const createTrip = useCallback(
    async (data: CreateTripRequest): Promise<Trip | null> => {
      setLastRequest(data);

      // Captured outside `run` so a failing generate still reports the row that
      // the POST already persisted.
      let created: Trip | null = null;

      await run(async () => {
        setLoadingStage('creating');
        created = await tripsApi.createTrip(data);
        publishTrip(created);

        setLoadingStage('generating');
        publishTrip(await tripsApi.generateRecommendation(created.id));
      });

      return created;
    },
    [run, publishTrip]
  );

  const loadTrip = useCallback(
    async (tripId: number) => {
      await run(async () => {
        setLoadingStage('loading');
        applyTrip(await tripsApi.getTrip(tripId));
      });
    },
    [run, applyTrip]
  );

  const updateAndRegenerate = useCallback(
    async (data: CreateTripRequest) => {
      if (!currentTrip) return;
      setLastRequest(data);
      await run(async () => {
        setLoadingStage('updating');
        const updated = await tripsApi.updateTrip(currentTrip.id, data);
        publishTrip(updated);

        setLoadingStage('generating');
        publishTrip(await tripsApi.generateRecommendation(updated.id));
      });
    },
    [currentTrip, run, publishTrip]
  );

  const regenerate = useCallback(async () => {
    if (!currentTrip) return;
    await run(async () => {
      setLoadingStage('generating');
      publishTrip(await tripsApi.generateRecommendation(currentTrip.id));
    });
  }, [currentTrip, run, publishTrip]);

  /**
   * A failure can happen before or after the trip row exists. Once it does,
   * retrying must regenerate that row rather than create a duplicate.
   */
  const retry = useCallback(async () => {
    if (currentTrip) {
      await regenerate();
    } else if (lastRequest) {
      await createTrip(lastRequest);
    }
  }, [currentTrip, regenerate, lastRequest, createTrip]);

  const resetTrip = useCallback(() => {
    setCurrentTrip(null);
    setRecommendation(null);
    setError(null);
    setLastRequest(null);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  return (
    <TripContext.Provider
      value={{
        currentTrip,
        recommendation,
        loading,
        loadingStage,
        error,
        createTrip,
        loadTrip,
        updateAndRegenerate,
        regenerate,
        retry,
        resetTrip,
        dismissError,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip(): TripContextValue {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
