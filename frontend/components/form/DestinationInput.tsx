'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { searchPlaces, PLACE_SEARCH_MIN_LENGTH, type PlaceSearchResult } from '@/lib/utils/geocoding';
import { countryCodeToFlag } from '@/lib/utils/country';
import type { SelectedLocation } from '@/lib/types/trip';
import { cn } from '@/lib/utils/cn';

export interface DestinationInputProps {
  selectedLocation: SelectedLocation | null;
  /** Called when the user picks a suggestion from the typed search. */
  onLocationSelect?: (location: SelectedLocation) => void;
}

const DEBOUNCE_MS = 350;
const LISTBOX_ID = 'destination-suggestions';

function formatLocation(location: SelectedLocation): string {
  return `${location.name}, ${location.country}`;
}

/**
 * Destination field that doubles as a type-to-search box: it shows whatever
 * was picked on the map, but typing triggers a debounced Nominatim search with
 * a dropdown of the closest-matching place names to pick from — an
 * alternative to clicking the map, not a replacement for it.
 */
export function DestinationInput({ selectedLocation, onLocationSelect }: DestinationInputProps) {
  const [query, setQuery] = useState(selectedLocation ? formatLocation(selectedLocation) : '');
  const [suggestions, setSuggestions] = useState<PlaceSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  // Sync the visible text when the selection changes from outside (a map
  // click) — but only then, so this never clobbers what the user is typing.
  // Adjusted during render (React's documented pattern for deriving state from
  // a prop change) rather than in an effect, which would cost an extra render
  // and cascade a second commit for what is otherwise a plain prop->state sync.
  const [prevSelectedLocation, setPrevSelectedLocation] = useState(selectedLocation);
  if (selectedLocation !== prevSelectedLocation) {
    setPrevSelectedLocation(selectedLocation);
    setQuery(selectedLocation ? formatLocation(selectedLocation) : '');
  }

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cancel any in-flight work on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function handleDocumentClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const runSearch = (value: string) => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < PLACE_SEARCH_MIN_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      setSearchFailed(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setSearchFailed(false);

      searchPlaces(trimmed, controller.signal)
        .then((results) => {
          setSuggestions(results);
          setOpen(true);
          setHighlighted(0);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setSearchFailed(true);
          setSuggestions([]);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
  };

  const selectSuggestion = (result: PlaceSearchResult) => {
    const location: SelectedLocation = {
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
      country: result.country,
      country_code: result.country_code,
    };
    onLocationSelect?.(location);
    setQuery(formatLocation(location));
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      // Swallow Enter so it never submits the whole multi-field form while the
      // user is just finishing typing the first one.
      if (e.key === 'Enter') e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectSuggestion(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label htmlFor="destination-search" className="text-sm font-medium text-gray-800">
        Destination
        <span className="ml-0.5 text-red-500" aria-hidden="true">
          *
        </span>
      </label>

      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus-within:ring-2 focus-within:ring-brand-primary">
          <MapPin size={16} style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
          <input
            id="destination-search"
            data-testid="destination-input"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={
              open && suggestions[highlighted] ? `destination-option-${highlighted}` : undefined
            }
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              runSearch(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            placeholder="Search a destination, or click the map below..."
            className="w-full bg-transparent text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          {loading ? (
            <Loader2 size={15} className="animate-spin text-gray-400" aria-hidden="true" />
          ) : (
            <Search size={15} className="text-gray-400" aria-hidden="true" />
          )}
        </div>

        {open && suggestions.length > 0 && (
          <ul
            id={LISTBOX_ID}
            role="listbox"
            aria-label="Destination suggestions"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            {suggestions.map((suggestion, index) => {
              const flag = countryCodeToFlag(suggestion.country_code);
              const isHighlighted = index === highlighted;
              return (
                <li
                  key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
                  id={`destination-option-${index}`}
                  role="option"
                  aria-selected={isHighlighted}
                  // onMouseDown (not onClick) fires before the input's onBlur,
                  // so the click registers instead of being lost to a close.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(suggestion);
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 px-3.5 py-2 text-sm',
                    isHighlighted ? 'bg-brand-surface-subtle' : 'hover:bg-gray-50'
                  )}
                >
                  <span className="mt-0.5 text-base leading-none" aria-hidden="true">
                    {flag ?? '📍'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {suggestion.name}, {suggestion.country}
                    </p>
                    <p className="truncate text-xs text-gray-500">{suggestion.displayName}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {searchFailed && (
          <p className="mt-1.5 text-xs text-brand-muted">
            Couldn&apos;t search right now — try again, or click the map below.
          </p>
        )}
      </div>
    </div>
  );
}
