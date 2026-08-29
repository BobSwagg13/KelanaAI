'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/shared/Button';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/components/providers/AuthProvider';
import { MIN_PASSWORD_LENGTH, registerSchema, type RegisterFormData } from '@/lib/types/auth';
import { createAppError, type AppError } from '@/lib/types/errors';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, user, initializing } = useAuth();
  const [error, setError] = useState<AppError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!initializing && user) {
      router.replace('/');
    }
  }, [initializing, user, router]);

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    try {
      await registerUser({ name: data.name, email: data.email, password: data.password });
      // Registration issues no token by design — send them to sign in.
      router.replace('/login?registered=1');
    } catch (err) {
      setError(createAppError(err));
    }
  };

  const field = (
    id: keyof RegisterFormData,
    label: string,
    type: string,
    autoComplete: string,
    hint?: string
  ) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-800">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        data-testid={`register-${id}`}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={errors[id] ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        {...register(id)}
      />
      {errors[id] ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
          {errors[id]?.message}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-brand-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start planning trips with KelanaAI."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-5">
          <ErrorDisplay error={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {field('name', 'Name', 'text', 'name')}
        {field('email', 'Email', 'email', 'email')}
        {field(
          'password',
          'Password',
          'password',
          'new-password',
          `At least ${MIN_PASSWORD_LENGTH} characters.`
        )}
        {field('confirmPassword', 'Confirm password', 'password', 'new-password')}

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          data-testid="register-submit"
          className="mt-2 w-full"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}
