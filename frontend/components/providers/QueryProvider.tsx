'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
            // Zero, not a window: pages wait for a fresh response rather than
            // painting cached data and correcting it a moment later. The cache
            // still earns its keep through request dedup, mutation seeding and
            // retries.
            staleTime: 0,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
