import axios from 'axios';
import { ZodError } from 'zod';

export type ErrorType = 'network' | 'validation' | 'server' | 'geocoding' | 'unknown';

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
  unknown: 'An unexpected error occurred. Please try again.',
};

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
      return {
        type: 'server',
        message: error.response.data?.detail || ERROR_MESSAGES.server,
        details: JSON.stringify(error.response.data),
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
