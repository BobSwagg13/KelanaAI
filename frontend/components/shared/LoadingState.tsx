'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type LoadingStage =
  | 'creating'
  | 'updating'
  | 'generating'
  | 'processing'
  | 'loading';

export interface LoadingStateProps {
  stage: LoadingStage;
  message?: string;
  progress?: number;
  estimatedSeconds?: number;
  className?: string;
}

const STAGE_MESSAGES: Record<LoadingStage, string> = {
  creating: 'Creating your trip...',
  updating: 'Updating your trip...',
  generating: 'Generating AI recommendations...',
  processing: 'Processing itinerary...',
  loading: 'Loading your trip...',
};

export function LoadingState({
  stage,
  message,
  progress,
  estimatedSeconds,
  className,
}: LoadingStateProps) {
  const displayMessage = message || STAGE_MESSAGES[stage];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}
    >
      <Loader2
        className="animate-spin"
        size={48}
        style={{ color: 'var(--brand-primary)' }}
        aria-hidden="true"
      />
      <p className="text-lg font-medium" style={{ color: 'var(--brand-ink)' }}>
        {displayMessage}
      </p>
      {typeof progress === 'number' && (
        <div className="w-full max-w-xs h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-accent))',
            }}
          />
        </div>
      )}
      {typeof estimatedSeconds === 'number' && estimatedSeconds > 0 && (
        <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
          Estimated time remaining: {estimatedSeconds}s
        </p>
      )}
      <span className="sr-only">Please wait, this may take a moment.</span>
    </div>
  );
}
