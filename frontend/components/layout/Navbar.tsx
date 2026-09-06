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
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils/cn';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const { user, initializing, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  /**
   * Whether a nav entry represents the page we're on.
   *
   * `/` must match exactly or it would light up everywhere. `/trips` matches by
   * prefix so a trip detail page keeps "History" highlighted. `/#travel-planner`
   * is a hash link into the home page and `usePathname()` drops the hash, so it
   * can only ever be current when we're already on `/`.
   */
  const isActive = (href: string): boolean => {
    const path = href.split('#')[0] || '/';
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  // Rendered twice: inline on desktop (`mobile=false`) and stacked in the panel
  // (`mobile=true`, with taller tap targets).
  const renderLinks = (mobile: boolean) => {
    const itemClass = mobile ? cn(linkClass, 'block py-2.5') : linkClass;

    const navLink = (href: string, label: string, testId?: string) => {
      const active = isActive(href);
      return (
        <Link
          href={href}
          onClick={closeMenu}
          data-testid={testId}
          aria-current={active ? 'page' : undefined}
          className={cn(
            itemClass,
            active &&
              (mobile
                ? 'border-l-2 border-brand-primary pl-3 text-brand-primary'
                : 'text-brand-primary underline decoration-2 underline-offset-8')
          )}
        >
          {label}
        </Link>
      );
    };

    if (user) {
      return (
        <>
          {navLink('/#travel-planner', 'Plan Trip')}
          {navLink('/trips', 'History')}
          {navLink('/assistant', 'Assistant', 'nav-assistant')}
          {navLink('/profile', 'Profile', 'nav-profile')}
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
        {navLink('/login', 'Sign in', 'nav-login')}
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
              {/* The source logo is black on transparent; the filter recolours
                  it white so it reads against the gradient tile. */}
              <Image
                src="/KelanaLogo.png"
                alt=""
                width={34}
                height={34}
                priority
                className="h-16 w-16 object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
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
