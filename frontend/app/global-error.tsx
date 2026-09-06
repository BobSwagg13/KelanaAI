'use client'; // Error boundaries must be Client Components

/**
 * Last-resort boundary for errors thrown by the root layout itself.
 *
 * This replaces the root layout when it renders, so it must supply its own
 * <html> and <body> and cannot rely on globals.css, the fonts, or the brand
 * tokens — hence the inline styles. Metadata exports are unsupported in a
 * Client Component, so the title is set with React's <title>.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#ffffff',
          color: '#0a0a0a',
        }}
      >
        <title>Something went wrong — KelanaAI</title>
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            KelanaAI hit an unexpected error
          </h1>
          <p style={{ color: '#6b7280', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            The app failed to start up. Reloading usually clears it.
          </p>
          {error.digest && (
            <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0 0 1.5rem' }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              border: 0,
              cursor: 'pointer',
              borderRadius: '9999px',
              padding: '0.7rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
