'use client';

import React, { useState } from 'react';
import { WifiOff, AlertTriangle, ServerCrash, MapPinOff, AlertCircle, X } from 'lucide-react';
import type { AppError, ErrorType } from '@/lib/types/errors';
import { Button } from './Button';
import { cn } from '@/lib/utils/cn';

export interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const ICONS: Record<ErrorType, React.ElementType> = {
  network: WifiOff,
  validation: AlertTriangle,
  server: ServerCrash,
  geocoding: MapPinOff,
  unknown: AlertCircle,
};

export function ErrorDisplay({ error, onRetry, onDismiss, className }: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const Icon = ICONS[error.type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-6 flex gap-4',
        className
      )}
    >
      <Icon className="text-red-500 shrink-0" size={24} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-red-900">{error.message}</p>

        {error.details && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="text-sm text-red-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
              aria-expanded={showDetails}
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
            {showDetails && (
              <pre className="mt-2 max-w-full overflow-x-auto rounded-lg bg-red-100 p-3 text-xs text-red-800 whitespace-pre-wrap break-words">
                {error.details}
              </pre>
            )}
          </div>
        )}

        {(onRetry || onDismiss) && (
          <div className="mt-4 flex gap-3">
            {error.retryable && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 text-red-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
