import Link from 'next/link';
import { Compass, MapPinned } from 'lucide-react';

/**
 * Catches both `notFound()` (thrown by /trips/[id] for a non-numeric id) and
 * any unmatched URL. A Server Component with no props, per the App Router
 * contract — client hooks like usePathname are not available here.
 */
export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-md"
        style={{ background: 'var(--brand-gradient)' }}
        aria-hidden="true"
      >
        <Compass size={30} className="text-white" />
      </div>

      <div>
        <p className="font-display text-5xl font-bold tracking-tight text-brand-primary">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-brand-ink">
          This route doesn&apos;t exist
        </h1>
        <p className="mt-2 text-brand-muted">
          The page you were looking for has moved, or the link was mistyped.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          style={{ background: 'var(--brand-gradient)' }}
        >
          Plan a trip
        </Link>
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 rounded-full border-2 border-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-primary transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
        >
          <MapPinned size={16} aria-hidden="true" />
          My trips
        </Link>
      </div>
    </section>
  );
}
