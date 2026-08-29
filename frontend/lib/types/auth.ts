import { z } from 'zod';

/** Mirrors the backend's MIN_PASSWORD_LENGTH in services/auth_service.py. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * bcrypt silently truncates past 72 BYTES, so the backend rejects anything
 * longer. Mirrored here to fail fast in the form.
 */
export const MAX_PASSWORD_BYTES = 72;

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  created_at: string | null;
  trips_planned: number;
  itineraries_generated: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

const passwordField = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .refine(
    (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
    `Password must be at most ${MAX_PASSWORD_BYTES} bytes`
  );

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
