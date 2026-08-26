'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import type { SelectedLocation } from '@/lib/types/trip';

export interface DestinationInputProps {
  selectedLocation: SelectedLocation | null;
}

export function DestinationInput({ selectedLocation }: DestinationInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="destination-display" className="text-sm font-medium text-gray-800">
        Destination
        <span className="ml-0.5 text-red-500" aria-hidden="true">
          *
        </span>
      </label>
      <div
        id="destination-display"
        data-testid="destination-input"
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm"
      >
        <MapPin size={16} style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
        {selectedLocation ? (
          <span className="text-gray-900">
            {selectedLocation.name}, {selectedLocation.country}
          </span>
        ) : (
          <span className="text-gray-400">Click on the map to select a destination</span>
        )}
      </div>
    </div>
  );
}
