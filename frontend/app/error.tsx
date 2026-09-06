'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import type { AppError } from '@/lib/types/errors';

/**
 * Route-level fallback for uncaught render/data errors.
 *
 * Wraps page, loading, not-found and any nested layout — but NOT the root
 * layout, which is what global-error.tsx is for.
 *
 * `retry` re-renders the segment and re-runs its data fetching; it replaced
 * `reset` as the documented default in Next 16.3.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Server Component errors reach the client stripped of their message, leaving
  // only a digest to correlate with the server log — so show whichever we have.
  const appError: AppError = {
    type: 'unknown',
    message: 'Something went wrong while loading this page.',
    details:
      process.env.NODE_ENV === 'production'
        ? error.digest && `Reference: ${error.digest}`
        : error.message,
    retryable: true,
  };

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-24 sm:px-6">
      <ErrorDisplay error={appError} onRetry={retry} />
      <p className="mt-6 text-center text-sm text-brand-muted">
        Still stuck?{' '}
        <Link href="/" className="font-semibold text-brand-primary hover:underline">
          Go back home
        </Link>
        .
      </p>
    </section>
  );
}
