'use client';

/**
 * Navbar Component
 *
 * Sticky navigation bar with KelanaAI branding and a backdrop blur. Links show
 * inline from the `md` breakpoint up; below that they collapse into a toggled
 * hamburger panel.
 *
 * **Validates: Requirements 6.1, 12.1**
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils/cn';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const { user, initializing, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Every link and button inside the panel calls this, so navigating always
  // closes it - no route-change effect needed.
  const closeMenu = () => setMenuOpen(false);

  // Escape closes the panel while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.replace('/login');
  };

  const linkClass =
    'rounded text-sm font-semibold text-brand-muted transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';

  // Rendered twice: inline on desktop (`mobile=false`) and stacked in the panel
  // (`mobile=true`, with taller tap targets).
  const renderLinks = (mobile: boolean) => {
    const itemClass = mobile ? cn(linkClass, 'block py-2.5') : linkClass;

    if (user) {
      return (
        <>
          <Link href="/#travel-planner" className={itemClass} onClick={closeMenu}>
            Plan Trip
          </Link>
          <Link href="/trips" className={itemClass} onClick={closeMenu}>
            History
          </Link>
          <Link
            href="/assistant"
            className={itemClass}
            data-testid="nav-assistant"
            onClick={closeMenu}
          >
            Assistant
          </Link>
          <Link
            href="/profile"
            className={itemClass}
            data-testid="nav-profile"
            onClick={closeMenu}
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            data-testid="nav-logout"
            className={cn(itemClass, 'inline-flex items-center gap-1.5', mobile && 'w-full')}
          >
            <LogOut size={15} aria-hidden="true" />
            Log out
          </button>
        </>
      );
    }

    return (
      <>
        <Link
          href="/login"
          className={itemClass}
          data-testid="nav-login"
          onClick={closeMenu}
        >
          Sign in
        </Link>
        <Link
          href="/register"
          data-testid="nav-register"
          onClick={closeMenu}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
            mobile && 'mt-1 text-center'
          )}
          style={{ background: 'var(--brand-gradient)' }}
        >
          Sign up
        </Link>
      </>
    );
  };

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
            onClick={closeMenu}
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
            Rendered only once the session has settled. Showing "Sign in" during
            initialization would flicker on every reload for a logged-in user.
          */}
          {!initializing && (
            <>
              {/* Desktop: links inline */}
              <div className="hidden items-center gap-4 sm:gap-6 md:flex">
                {renderLinks(false)}
              </div>

              {/* Mobile: hamburger toggle */}
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                data-testid="nav-menu-toggle"
                className="inline-flex items-center justify-center rounded-lg p-2 text-brand-ink transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary md:hidden"
              >
                {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile: collapsible panel */}
      {!initializing && menuOpen && (
        <div
          id="mobile-nav"
          className="border-t border-brand-border bg-white md:hidden"
        >
          <div className="container mx-auto flex flex-col px-4 py-2 sm:px-6">
            {renderLinks(true)}
          </div>
        </div>
      )}
    </nav>
  );
}
