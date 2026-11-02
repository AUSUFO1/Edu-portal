'use client';

import Link from 'next/link';

/** Unexpected errors: no details are shown; the digest lets support find the server log entry. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-danger">Something went wrong</p>
        <h1 className="mt-2 text-4xl font-bold text-navy">We couldn&apos;t load this page</h1>
        <p className="mt-2 text-ink/60">Please try again. If it keeps happening, contact the ICT unit{error.digest ? ` with reference ${error.digest}` : ''}.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
