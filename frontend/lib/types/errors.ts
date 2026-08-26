import axios from 'axios';
import { ZodError } from 'zod';

export type ErrorType =
  | 'network'
  | 'validation'
  | 'server'
  | 'geocoding'
  | 'notfound'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  retryable: boolean;
  field?: string;
}

export const ERROR_MESSAGES: Record<ErrorType, string> = {
  network: 'Unable to connect to the server. Please check your internet connection.',
  validation: 'Please check your input and try again.',
  server: 'The server encountered an error. Please try again later.',
  geocoding: 'Unable to determine the location. Please try selecting a different point.',
  notfound: 'We could not find what you were looking for.',
  unknown: 'An unexpected error occurred. Please try again.',
};

/**
 * Reduce a FastAPI error body to a displayable string.
 *
 * FastAPI returns `detail` as a plain string for `HTTPException`, but as an
 * ARRAY of `{loc, msg, type}` objects for 422 validation failures. Assigning
 * that array straight to `AppError.message` makes React throw "Objects are not
 * valid as a React child" when ErrorDisplay renders it.
 */
function extractDetailMessage(detail: unknown): string | null {
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          const { msg, loc } = item as { msg?: unknown; loc?: unknown };
          const field = Array.isArray(loc) ? loc.filter((p) => p !== 'body').join('.') : '';
          return field ? `${field}: ${String(msg)}` : String(msg);
        }
        return null;
      })
      .filter((p): p is string => Boolean(p));
    return parts.length ? parts.join(', ') : null;
  }
  return null;
}

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    'retryable' in error
  );
}

export function createAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status;
      const detail = extractDetailMessage(error.response.data?.detail);
      const details = JSON.stringify(error.response.data);

      // A missing row will never appear on retry, so offering one is a trap.
      if (status === 404) {
        return {
          type: 'notfound',
          message: detail || ERROR_MESSAGES.notfound,
          details,
          retryable: false,
        };
      }

      // 422 is a bad request from us, not a transient server fault.
      if (status === 422) {
        return {
          type: 'validation',
          message: detail || ERROR_MESSAGES.validation,
          details,
          retryable: false,
        };
      }

      return {
        type: 'server',
        message: detail || ERROR_MESSAGES.server,
        details,
        retryable: true,
      };
    }
    if (error.request) {
      return {
        type: 'network',
        message: ERROR_MESSAGES.network,
        details: error.message,
        retryable: true,
      };
    }
    return {
      type: 'unknown',
      message: ERROR_MESSAGES.unknown,
      details: error.message,
      retryable: false,
    };
  }

  if (error instanceof ZodError) {
    return {
      type: 'validation',
      message: ERROR_MESSAGES.validation,
      details: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      retryable: false,
    };
  }

  return {
    type: 'unknown',
    message: ERROR_MESSAGES.unknown,
    details: error instanceof Error ? error.message : String(error),
    retryable: false,
  };
}
