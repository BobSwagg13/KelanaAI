'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hero } from '@/components/layout/Hero';
import { TravelForm } from '@/components/form/TravelForm';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { TripProvider, useTrip } from '@/components/providers/TripProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import type { SelectedLocation, TripFormData } from '@/lib/types/trip';

// Leaflet needs `window`, so this may only be imported from a client component.
const DestinationMap = dynamic(
  () => import('@/components/map/DestinationMap').then((m) => m.DestinationMap),
  {
    ssr: false,
    loading: () => <div className="h-[400px] rounded-2xl bg-brand-surface-subtle animate-pulse" />,
  }
);

function PlannerContent() {
  const router = useRouter();
  const { loading, loadingStage, error, createTrip, retry, dismissError } = useTrip();
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

  // Generation takes ~15-20s. If the user navigates away meanwhile, the resolved
  // promise must not yank them back off the page they chose.
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleCreate = useCallback(
    async (data: TripFormData) => {
      const trip = await createTrip(data);

      // Non-null means the row exists, even if generating its itinerary failed.
      // Navigating regardless is what stops a retry from creating a duplicate:
      // the detail page regenerates the trip we already have.
      if (trip && isMounted.current) {
        router.push(`/trips/${trip.id}`);
      }
    },
    [createTrip, router]
  );

  return (
    <>
      <Hero greeting={user ? `Welcome back, ${user.name} 👋` : undefined} />

      <section
        id="travel-planner"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-10"
      >
        {error && <ErrorDisplay error={error} onRetry={retry} onDismiss={dismissError} />}

        {loading && loadingStage && <LoadingState stage={loadingStage} />}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <DestinationMap
              onLocationSelect={setSelectedLocation}
              selectedLocation={selectedLocation}
            />
            <TravelForm
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
              onSubmit={handleCreate}
              isLoading={loading}
            />
          </div>
        )}
      </section>
    </>
  );
}

export default function Home() {
  return (
    <RequireAuth>
      <ErrorBoundary>
        <TripProvider>
          <PlannerContent />
        </TripProvider>
      </ErrorBoundary>
    </RequireAuth>
  );
}
