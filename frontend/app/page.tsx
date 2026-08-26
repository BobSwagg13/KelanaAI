'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/layout/Hero';
import { Footer } from '@/components/layout/Footer';
import { TravelForm } from '@/components/form/TravelForm';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Button } from '@/components/shared/Button';
import { TripProvider, useTrip } from '@/components/providers/TripProvider';
import {
  tripToFormData,
  tripToSelectedLocation,
  type SelectedLocation,
  type TripFormData,
} from '@/lib/types/trip';

const DestinationMap = dynamic(
  () => import('@/components/map/DestinationMap').then((m) => m.DestinationMap),
  {
    ssr: false,
    loading: () => <div className="h-[400px] rounded-2xl bg-brand-surface-subtle animate-pulse" />,
  }
);

const RecommendationDisplay = dynamic(
  () =>
    import('@/components/recommendations/RecommendationDisplay').then(
      (m) => m.RecommendationDisplay
    ),
  {
    loading: () => <LoadingState stage="generating" message="Loading your recommendations..." />,
  }
);

function PlannerContent() {
  const {
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
  } = useTrip();

  // Map selection for the initial create flow.
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  // Separate selection while editing, seeded from the saved trip so the user
  // can change the destination without losing it if they cancel.
  const [editLocation, setEditLocation] = useState<SelectedLocation | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const showResults = Boolean(recommendation && currentTrip);

  const handleCreate = async (data: TripFormData) => {
    await createTrip(data);
  };

  const handleSaveAndRegenerate = async (data: TripFormData) => {
    await updateAndRegenerate(data);
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    if (currentTrip) {
      setEditLocation(tripToSelectedLocation(currentTrip));
      setIsEditing(true);
    }
  };

  const handleNewTrip = () => {
    resetTrip();
    setSelectedLocation(null);
    setEditLocation(null);
    setIsEditing(false);
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" className="flex-1">
        <Hero />

        <section
          id="travel-planner"
          className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-10"
        >
          {error && <ErrorDisplay error={error} onRetry={retry} onDismiss={dismissError} />}

          {loading && loadingStage && <LoadingState stage={loadingStage} />}

          {/* Create flow: no trip yet */}
          {!loading && !showResults && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <DestinationMap
                onLocationSelect={setSelectedLocation}
                selectedLocation={selectedLocation}
              />
              <TravelForm
                selectedLocation={selectedLocation}
                onSubmit={handleCreate}
                isLoading={loading}
              />
            </div>
          )}

          {/* Results, with an edit affordance above them */}
          {!loading && showResults && currentTrip && recommendation && (
            <>
              <div className="flex justify-end">
                <Button
                  variant={isEditing ? 'ghost' : 'outline'}
                  onClick={isEditing ? () => setIsEditing(false) : handleStartEditing}
                  aria-expanded={isEditing}
                  aria-controls="edit-trip-panel"
                  data-testid="edit-trip-toggle"
                >
                  {isEditing ? (
                    <>
                      <X size={16} /> Cancel edit
                    </>
                  ) : (
                    <>
                      <Pencil size={16} /> Edit trip
                    </>
                  )}
                </Button>
              </div>

              {isEditing && (
                <div
                  id="edit-trip-panel"
                  className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
                >
                  <DestinationMap
                    onLocationSelect={setEditLocation}
                    selectedLocation={editLocation}
                  />
                  <TravelForm
                    selectedLocation={editLocation}
                    initialValues={tripToFormData(currentTrip)}
                    onSubmit={handleSaveAndRegenerate}
                    isLoading={loading}
                    submitLabel="Save & Regenerate"
                    loadingLabel="Regenerating..."
                  />
                </div>
              )}

              <RecommendationDisplay
                recommendation={recommendation}
                trip={currentTrip}
                onNewTrip={handleNewTrip}
                onRegenerate={regenerate}
              />
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <TripProvider>
        <PlannerContent />
      </TripProvider>
    </ErrorBoundary>
  );
}
