'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { tripsApi } from '@/lib/api/trips';
import { createAppError, type AppError } from '@/lib/types/errors';
import type { CreateTripRequest, Trip } from '@/lib/types/trip';
import type { StructuredRecommendation } from '@/lib/types/recommendation';

export type LoadingStage = 'creating' | 'updating' | 'generating';

interface TripContextValue {
  currentTrip: Trip | null;
  recommendation: StructuredRecommendation | null;
  loading: boolean;
  loadingStage: LoadingStage | null;
  error: AppError | null;
  /** First run: create the trip, then generate its recommendation. */
  createTrip: (data: CreateTripRequest) => Promise<void>;
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

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [recommendation, setRecommendation] = useState<StructuredRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [lastRequest, setLastRequest] = useState<CreateTripRequest | null>(null);

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

  const createTrip = useCallback(
    async (data: CreateTripRequest) => {
      setLastRequest(data);
      await run(async () => {
        setLoadingStage('creating');
        const trip = await tripsApi.createTrip(data);
        setCurrentTrip(trip);

        setLoadingStage('generating');
        applyTrip(await tripsApi.generateRecommendation(trip.id));
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
        setCurrentTrip(updated);

        setLoadingStage('generating');
        applyTrip(await tripsApi.generateRecommendation(updated.id));
      });
    },
    [currentTrip, run, applyTrip]
  );

  const regenerate = useCallback(async () => {
    if (!currentTrip) return;
    await run(async () => {
      setLoadingStage('generating');
      applyTrip(await tripsApi.generateRecommendation(currentTrip.id));
    });
  }, [currentTrip, run, applyTrip]);

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
