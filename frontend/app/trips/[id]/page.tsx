import { notFound } from 'next/navigation';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { TripProvider } from '@/components/providers/TripProvider';
import { TripDetailView } from '@/components/trips/TripDetailView';

export const metadata = {
  title: 'Trip · KelanaAI',
};

/**
 * Server component. It exists to validate the route param — `notFound()` is not
 * callable from a Client Component, and `/trips/abc` would otherwise reach the
 * API and come back as a 422 rather than a 404. Fetching stays client-side so
 * the page reuses AppError/ErrorDisplay and stays live after a regenerate.
 */
export default async function TripDetailPage(props: PageProps<'/trips/[id]'>) {
  const { id } = await props.params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  return (
    <RequireAuth>
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <ErrorBoundary>
          <TripProvider>
            <TripDetailView tripId={Number(id)} />
          </TripProvider>
        </ErrorBoundary>
      </section>
    </RequireAuth>
  );
}
