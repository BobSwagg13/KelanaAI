'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '@/lib/api/auth';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/api/client';
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Restore the session on first load. Nothing is set synchronously in the
  // effect body — the writes happen in async continuations — so this does not
  // trip react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;

    if (!getStoredToken()) {
      // No token: settle immediately without a pointless network round-trip.
      Promise.resolve().then(() => {
        if (!cancelled) setInitializing(false);
      });
      return () => {
        cancelled = true;
      };
    }

    authApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        // Expired or revoked. The response interceptor already dropped the
        // token; just fall through to the logged-out state.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const result = await authApi.login(data);
    // Store the token before setting state: the very next request must be able
    // to read it from the interceptor.
    setStoredToken(result.access_token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    // No token is issued here by design; the caller redirects to /login.
    await authApi.register(data);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      setUser(await authApi.me());
    } catch {
      setUser(null);
    }
  }, []);

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
