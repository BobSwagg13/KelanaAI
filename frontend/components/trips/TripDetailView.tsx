'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, X, Sparkles, ArrowLeft } from 'lucide-react';
import { TravelForm } from '@/components/form/TravelForm';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { useTrip } from '@/components/providers/TripProvider';
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
    loading: () => <LoadingState stage="loading" message="Loading your itinerary..." />,
  }
);

export interface TripDetailViewProps {
  tripId: number;
}

export function TripDetailView({ tripId }: TripDetailViewProps) {
  const router = useRouter();
  const {
    currentTrip,
    recommendation,
    loading,
    loadingStage,
    error,
    loadTrip,
    updateAndRegenerate,
    regenerate,
    retry,
    resetTrip,
    dismissError,
  } = useTrip();

  const [editLocation, setEditLocation] = useState<SelectedLocation | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch on mount (and whenever the id changes) unless the provider was already
  // seeded with this trip. `loadTrip` comes from context, so the setState it
  // performs is not reachable synchronously from this effect body.
  useEffect(() => {
    if (currentTrip?.id !== tripId) {
      void loadTrip(tripId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

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
    router.push('/');
  };

  if (loading && loadingStage) {
    return <LoadingState stage={loadingStage} />;
  }

  // A trip that could not be loaded at all — bad id, or the row was deleted.
  if (!currentTrip) {
    return (
      <div className="flex flex-col items-center gap-6 py-16">
        {error ? (
          <div className="w-full max-w-lg">
            <ErrorDisplay error={error} onRetry={retry} onDismiss={dismissError} />
          </div>
        ) : (
          <p className="text-brand-muted">This trip could not be found.</p>
        )}
        <Link href="/trips">
          <Button variant="outline">
            <ArrowLeft size={16} /> Back to history
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <ErrorDisplay error={error} onRetry={retry} onDismiss={dismissError} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-brand-muted transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          <ArrowLeft size={16} /> Back to history
        </Link>

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
        <div id="edit-trip-panel" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start [&>*]:min-w-0">
          <DestinationMap onLocationSelect={setEditLocation} selectedLocation={editLocation} />
          <TravelForm
            selectedLocation={editLocation}
            onLocationSelect={setEditLocation}
            initialValues={tripToFormData(currentTrip)}
            onSubmit={handleSaveAndRegenerate}
            isLoading={loading}
            submitLabel="Save & Regenerate"
            loadingLabel="Regenerating..."
          />
        </div>
      )}

      {recommendation ? (
        <RecommendationDisplay
          recommendation={recommendation}
          trip={currentTrip}
          onNewTrip={handleNewTrip}
          onRegenerate={regenerate}
        />
      ) : (
        /*
          The trip exists but has no itinerary: either generation failed (the
          backend returns 502 and deliberately persists nothing) or it was never
          run. Offer to generate rather than showing an empty page.
        */
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <Sparkles size={32} style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
          <div>
            <p className="font-display text-xl font-bold text-brand-ink">
              No itinerary yet
            </p>
            <p className="mt-1 text-sm text-brand-muted">
              This trip is saved, but its itinerary hasn&apos;t been generated.
            </p>
          </div>
          <Button onClick={regenerate} data-testid="generate-itinerary">
            <Sparkles size={16} /> Generate itinerary
          </Button>
        </Card>
      )}
    </div>
  );
}
