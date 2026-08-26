'use client';

/**
 * Navbar Component
 *
 * Sticky navigation bar with KelanaAI branding and a backdrop blur.
 *
 * **Validates: Requirements 6.1, 12.1**
 */

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
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
          <div className="flex items-center gap-3">
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
              <span className="text-xs text-brand-muted font-medium">
                AI-Powered Travel Planning
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#travel-planner"
              className="text-sm font-semibold text-brand-muted hover:text-brand-primary transition-colors"
            >
              Plan Trip
            </a>

          </div>

          <button
            className="md:hidden p-2 rounded-lg text-brand-muted hover:text-brand-primary hover:bg-brand-surface-subtle transition-colors"
            aria-label="Open menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
