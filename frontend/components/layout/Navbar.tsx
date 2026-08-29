'use client';

/**
 * Navbar Component
 *
 * Sticky navigation bar with KelanaAI branding and a backdrop blur.
 *
 * **Validates: Requirements 6.1, 12.1**
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils/cn';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const { user, initializing, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const linkClass =
    'rounded text-sm font-semibold text-brand-muted transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';

  return (
    <nav
      className={cn(
        'sticky top-0 z-9999 w-full',
        'bg-white/80 backdrop-blur-md',
        'border-b border-brand-border',
        'transition-all duration-300',
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            aria-label="KelanaAI home"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg shadow-md transition-transform hover:scale-105"
              style={{ background: 'var(--brand-gradient)' }}
            >
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {/* Compass/Travel icon */}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <div className="flex flex-col">
              <span className="font-display text-xl font-bold tracking-tight text-brand-primary">
                KelanaAI
              </span>
              <span className="hidden text-xs text-brand-muted font-medium sm:block">
                AI-Powered Travel Planning
              </span>
            </div>
          </Link>

          {/*
            Visible at every breakpoint. These were previously `hidden md:flex`
            behind a hamburger button that had no handler, which would leave
            History unreachable on mobile.
          */}
          {/*
            Rendered only once the session has settled. Showing "Sign in" during
            initialization would flicker on every reload for a logged-in user.
          */}
          {!initializing && (
            <div className="flex items-center gap-4 sm:gap-6">
              {user ? (
                <>
                  <Link href="/#travel-planner" className={linkClass}>
                    Plan Trip
                  </Link>
                  <Link href="/trips" className={linkClass}>
                    History
                  </Link>
                  <Link href="/profile" className={linkClass} data-testid="nav-profile">
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    data-testid="nav-logout"
                    className={cn(linkClass, 'inline-flex items-center gap-1.5')}
                  >
                    <LogOut size={15} aria-hidden="true" />
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className={linkClass} data-testid="nav-login">
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    data-testid="nav-register"
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                    style={{ background: 'var(--brand-gradient)' }}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
