import axios from 'axios';
import { createAppError } from '@/lib/types/errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'kelanaai_token';

/**
 * The JWT lives in localStorage, so it survives a reload but is readable by any
 * script on the page — route protection is therefore client-side (see
 * RequireAuth). Every accessor tolerates storage being unavailable (private
 * mode, disabled site data) and returns null rather than throwing.
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable — the session simply won't survive a reload.
  }
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do; the token was never persisted.
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // AI generation measures 14-18s for a typical trip; the edit flow issues an
  // update and a generate back to back.
  timeout: 120000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 means the token is missing, expired, or its account is gone. Drop it
    // so the app stops re-sending a credential the server has already rejected.
    // The redirect is left to RequireAuth, which knows the current route and can
    // preserve it as a `next` param.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredToken();
    }
    return Promise.reject(createAppError(error));
  }
);
