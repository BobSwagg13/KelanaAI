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
 * `staleTime` is what actually removes the perceived delay on revisits: a
 * cached list paints immediately and only revalidates in the background once
 * it's older than a minute. `refetchOnWindowFocus` is off because tab-switching
 * is not a signal that trips or conversations changed.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
