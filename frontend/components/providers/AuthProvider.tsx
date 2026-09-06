'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/api/client';
import { authKeys } from '@/lib/queries/keys';
import type { AuthUser, LoginRequest, RegisterRequest } from '@/lib/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  /**
   * True until the stored token has been checked against the server. Guards
   * must wait for this before redirecting, or a reload would bounce a
   * legitimately logged-in user to /login.
   */
  initializing: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  /** Re-fetch the user, e.g. so profile counters reflect a new trip. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  /**
   * Whether a token exists. `null` means "not looked yet", which is what keeps
   * `initializing` true through the first paint.
   *
   * This has to be state rather than a lazy initializer: localStorage is
   * unreadable during prerender, so seeding from it would make the server and
   * the first client render disagree. It also changes on login/logout, which a
   * one-shot read could not express.
   */
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Written from a continuation rather than synchronously, so this doesn't
    // trip react-hooks/set-state-in-effect.
    Promise.resolve().then(() => setHasToken(Boolean(getStoredToken())));
  }, []);

  /**
   * The session lives in the query cache, so every consumer of `user` shares
   * one request. This is what removed the second, identical GET /auth/me that
   * /profile used to fire on mount.
   */
  const query = useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.me,
    enabled: hasToken === true,
    // A rejected token is not worth retrying — the interceptor already dropped it.
    retry: false,
  });

  const user = hasToken === true ? (query.data ?? null) : null;
  const initializing = hasToken === null || (hasToken === true && query.isLoading);

  const login = useCallback(
    async (data: LoginRequest) => {
      const result = await authApi.login(data);
      // Store the token before anything else: the very next request must be
      // able to read it from the interceptor.
      setStoredToken(result.access_token);
      setHasToken(true);
      // Login already returns the user, so seed the cache instead of making
      // the enabled-now query fetch the same payload again.
      queryClient.setQueryData(authKeys.me(), result.user);
    },
    [queryClient]
  );

  const register = useCallback(async (data: RegisterRequest) => {
    // No token is issued here by design; the caller redirects to /login.
    await authApi.register(data);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setHasToken(false);
    // Drop the session outright — leaving it cached would let the next login
    // flash the previous user's name.
    queryClient.removeQueries({ queryKey: authKeys.me() });
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) return;
    // Invalidate rather than refetch: consumers keep rendering the cached user
    // while this revalidates, so nothing blanks out.
    await queryClient.invalidateQueries({ queryKey: authKeys.me() });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
