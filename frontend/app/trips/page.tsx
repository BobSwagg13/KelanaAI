import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { TripsBrowser } from '@/components/trips/TripsBrowser';

export const metadata = {
  title: 'Trip history · KelanaAI',
  description: 'Browse, search and sort every trip you have planned with KelanaAI.',
};

export default function TripsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-brand-ink">
          Trip history
        </h1>
        <p className="mt-2 text-brand-muted">
          Every trip you&apos;ve planned. Search by destination or travel style.
        </p>
      </header>

      <ErrorBoundary>
        <TripsBrowser />
      </ErrorBoundary>
    </section>
  );
}
