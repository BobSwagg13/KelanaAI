'use client';

import React from 'react';
import { MapPinned } from 'lucide-react';
import { mapsSearchUrl } from '@/lib/utils/places';

export interface MapLinkProps {
  name: string;
  location?: string | null;
  destination: string;
  country?: string | null;
}

/**
 * Small "find this on a map" affordance.
 *
 * Deliberately an icon rather than turning the place name into a link — every
 * activity and restaurant gets one, and linking all of them would turn the
 * itinerary into a wall of blue text.
 */
export function MapLink({ name, location, destination, country }: MapLinkProps) {
  return (
    <a
      href={mapsSearchUrl(name, location, destination, country)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${name} in Google Maps`}
      title="Open in Google Maps"
      className="inline-flex shrink-0 rounded p-0.5 text-brand-muted transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <MapPinned size={14} aria-hidden="true" />
    </a>
  );
}
