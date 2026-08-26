'use client';

import 'leaflet/dist/leaflet.css';
import React, { useCallback, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { MapMarker } from './MapMarker';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { reverseGeocode } from '@/lib/utils/geocoding';
import type { SelectedLocation } from '@/lib/types/trip';
import { createAppError, type AppError } from '@/lib/types/errors';
import { cn } from '@/lib/utils/cn';

export interface DestinationMapProps {
  onLocationSelect: (location: SelectedLocation) => void;
  selectedLocation?: SelectedLocation | null;
  className?: string;
}

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function DestinationMap({ onLocationSelect, selectedLocation, className }: DestinationMapProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleClick = useCallback(
    async (lat: number, lng: number) => {
      setError(null);
      setLoading(true);
      setPendingCoords({ lat, lng });
      try {
        const location = await reverseGeocode(lat, lng);
        onLocationSelect(location);
      } catch (err) {
        setError(createAppError(err));
      } finally {
        setLoading(false);
      }
    },
    [onLocationSelect]
  );

  const handleRetry = useCallback(() => {
    if (pendingCoords) {
      handleClick(pendingCoords.lat, pendingCoords.lng);
    }
  }, [pendingCoords, handleClick]);

  return (
    <div
      className={cn('relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm', className)}
      data-testid="destination-map"
    >
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        scrollWheelZoom
        aria-label="Interactive world map for selecting your destination"
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={TILE_URL}
        />
        <ClickHandler onClick={handleClick} />
        {selectedLocation && (
          <MapMarker
            position={[selectedLocation.latitude, selectedLocation.longitude]}
            label={`${selectedLocation.name}, ${selectedLocation.country}`}
          />
        )}
      </MapContainer>

      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <LoadingState stage="processing" message="Finding location..." />
        </div>
      )}

      {error && (
        <div className="absolute inset-x-4 bottom-4 z-[1000]">
          <ErrorDisplay error={error} onRetry={handleRetry} onDismiss={() => setError(null)} />
        </div>
      )}
    </div>
  );
}
