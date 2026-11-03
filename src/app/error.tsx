'use client';

import Link from 'next/link';

/** Unexpected errors: no internals are shown; the reference lets support find the server log entry. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold text-navy sm:text-3xl">This page didn&apos;t load</h1>
        <p className="mt-3 text-ink/60">
          Something interrupted the request. Please try again; your work has not been lost.
          {error.digest && <span className="mt-2 block text-xs text-ink/40">Reference: {error.digest}</span>}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Go to my dashboard
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Sign in again
          </Link>
        </div>
      </div>
    </main>
  );
}
