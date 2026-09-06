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

/**
 * A `detail` that reads like a raw exception rather than advice for the user.
 *
 * The backend's deliberate messages (RecommendationError, KnowledgeBaseError,
 * auth failures) are written as sentences and should be shown verbatim. An
 * unhandled 500 gives us FastAPI's bare "Internal Server Error" or a Python
 * repr, which is noise — fall back to the canned copy for those.
 */
function looksLikeException(text: string): boolean {
  return (
    text === 'Internal Server Error' ||
    text.includes('Traceback') ||
    text.includes(' object at 0x') ||
    /^[A-Za-z_]*Error\b/.test(text)
  );
}

/**
 * The diagnostic line behind "Show details".
 *
 * Never the raw response body: `JSON.stringify(data)` put `{"detail":"..."}`
 * on screen braces-and-all, which just repeated the headline in a worse format.
 * In development the whole body is genuinely useful, so it is pretty-printed
 * there; in production we only add a status line when there was no usable
 * `detail`, and otherwise omit details entirely so the toggle doesn't render.
 */
function buildDetails(
  status: number,
  data: unknown,
  detail: string | null
): string | undefined {
  if (process.env.NODE_ENV !== 'production') {
    try {
      return `HTTP ${status}\n${JSON.stringify(data, null, 2)}`;
    } catch {
      return `HTTP ${status}`;
    }
  }
  return detail ? undefined : `HTTP ${status}`;
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
      const raw = extractDetailMessage(error.response.data?.detail);
      const detail = raw && !looksLikeException(raw) ? raw : null;
      const details = buildDetails(status, error.response.data, detail);

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
