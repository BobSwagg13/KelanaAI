'use client';

import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export interface MapMarkerProps {
  position: [number, number];
  label: string;
  /** Marker fill. Defaults to the brand blue. */
  color?: string;
}

const BRAND_BLUE = '#2563EB';

function buildIcon(color: string): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="${color}"/>
      <circle cx="18" cy="18" r="7" fill="white"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'brand-marker animate-bounce',
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -44],
  });
}

export function MapMarker({ position, label, color = BRAND_BLUE }: MapMarkerProps) {
  return (
    <Marker position={position} icon={buildIcon(color)}>
      <Popup>
        <strong>{label}</strong>
      </Popup>
    </Marker>
  );
}
