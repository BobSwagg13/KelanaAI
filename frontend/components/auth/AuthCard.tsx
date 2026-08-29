'use client';

import React from 'react';
import Link from 'next/link';
import { Compass } from 'lucide-react';

export interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/** Shared shell for the login and register screens. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:py-20">
      <div className="flex flex-col items-center gap-3 text-center">
        <Link
          href="/login"
          aria-label="KelanaAI"
          className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <Compass className="h-6 w-6 text-white" aria-hidden="true" />
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-ink">{title}</h1>
        <p className="text-sm text-brand-muted">{subtitle}</p>
      </div>

      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>

      <p className="text-center text-sm text-brand-muted">{footer}</p>
    </section>
  );
}
