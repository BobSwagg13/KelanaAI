'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/shared/Button';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { LoadingState } from '@/components/shared/LoadingState';
import { useAuth } from '@/components/providers/AuthProvider';
import { loginSchema, type LoginFormData } from '@/lib/types/auth';
import { createAppError, type AppError } from '@/lib/types/errors';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, initializing } = useAuth();
  const [error, setError] = useState<AppError | null>(null);

  const justRegistered = searchParams.get('registered') === '1';
  // Where RequireAuth wanted to send them before the redirect to /login.
  const next = searchParams.get('next') || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Already signed in (or just signed in): don't sit on the login screen.
  useEffect(() => {
    if (!initializing && user) {
      router.replace(next);
    }
  }, [initializing, user, next, router]);

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await login(data);
      router.replace(next);
    } catch (err) {
      setError(createAppError(err));
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to plan and revisit your trips."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-brand-primary hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {justRegistered && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          Account created. Sign in to get started.
        </p>
      )}

      {error && (
        <div className="mb-5">
          <ErrorDisplay error={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-gray-800">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            data-testid="login-email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-gray-800">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            data-testid="login-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          data-testid="login-submit"
          className="mt-2 w-full"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary in a prerendered route.
  return (
    <Suspense fallback={<LoadingState stage="loading" message="Loading..." />}>
      <LoginForm />
    </Suspense>
  );
}
