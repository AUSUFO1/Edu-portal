import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-green">404</p>
        <h1 className="mt-2 text-4xl font-bold text-navy">Page not found</h1>
        <p className="mt-2 text-ink/60">The page does not exist, or you do not have access to it.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Back to my dashboard
        </Link>
      </div>
    </main>
  );
}
