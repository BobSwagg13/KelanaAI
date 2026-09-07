'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Mail, CalendarDays, MapPinned, Sparkles } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { LoadingState } from '@/components/shared/LoadingState';

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof MapPinned;
  value: number;
  label: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1 text-center">
      <Icon size={20} style={{ color: 'var(--brand-primary)' }} aria-hidden="true" />
      <p className="font-display text-3xl font-bold text-brand-ink">{value}</p>
      <p className="text-sm text-brand-muted">{label}</p>
    </Card>
  );
}

function ProfileContent() {
  const { user, logout, refreshUser, refreshing } = useAuth();
  const router = useRouter();
  const [refreshed, setRefreshed] = useState(false);

  // `user` is cached from login/session-restore, so trips_planned and
  // itineraries_generated go stale the moment a trip is created elsewhere.
  // `refreshUser` comes from context, so the setState it performs on resolve
  // is not reachable synchronously from this effect body.
  useEffect(() => {
    void refreshUser().then(() => setRefreshed(true));
  }, [refreshUser]);

  // Nothing renders until the refresh lands. `user` is already cached from
  // session restore, so painting it first would show last-known counters and
  // then correct them — exactly the stale flash we want gone here.
  if (!user || !refreshed || refreshing) {
    return <LoadingState stage="loading" message="Loading your profile..." />;
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const joined = user.created_at ? new Date(user.created_at) : null;
  const joinedLabel =
    joined && !Number.isNaN(joined.getTime())
      ? joined.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col gap-8">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold text-white shadow-md"
          style={{ background: 'var(--brand-gradient)' }}
          aria-hidden="true"
        >
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <h1
            className="font-display text-3xl font-bold tracking-tight text-brand-ink"
            data-testid="profile-name"
          >
            {user.name}
          </h1>
          <p
            className="mt-1 inline-flex items-center gap-1.5 text-brand-muted"
            data-testid="profile-email"
          >
            <Mail size={14} aria-hidden="true" />
            {user.email}
          </p>
          {joinedLabel && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand-muted sm:ml-4">
              <CalendarDays size={14} aria-hidden="true" />
              Joined {joinedLabel}
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat icon={MapPinned} value={user.trips_planned} label="Trips planned" />
        <Stat icon={Sparkles} value={user.itineraries_generated} label="Itineraries generated" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/trips">
          <Button variant="outline">View my trips</Button>
        </Link>
        <Link href="/">
          <Button>Plan a new trip</Button>
        </Link>
        <Button variant="ghost" onClick={handleLogout} data-testid="profile-logout">
          <LogOut size={16} /> Log out
        </Button>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
