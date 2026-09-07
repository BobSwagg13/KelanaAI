'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

/**
 * Holds the app's query cache.
 *
 * Mounted above AuthProvider in the root layout, because auth itself is a query
 * now. The client lives in state so a re-render never swaps the cache out from
 * under the tree.
 *
 * `refetchOnWindowFocus` is off because tab-switching is not a signal that
 * trips or conversations changed.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Lists paint from cache and revalidate behind it. This is only
            // safe because every mutation now writes through to the cache, so
            // what it holds is already correct — the earlier stale flash was a
            // cache-truthfulness bug, not a caching one. /profile still waits
            // for fresh counters via its own gate.
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // Wake the backend and its database while the user is still reading the
  // first page. Neon's free tier auto-suspends after a few minutes idle, so
  // without this the first real action of a session pays the cold start. The
  // endpoint runs a SELECT 1 and returns nothing we use, so failures are
  // ignored outright — this must never surface an error.
  useEffect(() => {
    apiClient.get('/api/v1/health').catch(() => {});
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
