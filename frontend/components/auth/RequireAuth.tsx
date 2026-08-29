'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { LoadingState } from '@/components/shared/LoadingState';

/**
 * Client-side route guard for pages that require a session.
 *
 * Because the token lives in localStorage, Next middleware cannot see it, so
 * protection has to run in the browser. Two consequences are handled here:
 *
 *  - Nothing renders until `initializing` settles, otherwise a reload would
 *    redirect a logged-in user to /login before their token is verified.
 *  - Children are withheld while logged out, so protected content never flashes
 *    on screen during the redirect.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initializing && !user) {
      // Preserve where they were headed so login can send them back.
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [initializing, user, pathname, router]);

  if (initializing) {
    return <LoadingState stage="loading" message="Checking your session..." />;
  }

  if (!user) {
    // Redirect is in flight; render nothing rather than protected content.
    return <LoadingState stage="loading" message="Redirecting to sign in..." />;
  }

  return <>{children}</>;
}
