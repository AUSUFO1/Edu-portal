import { Mortarboard01Icon } from '@hugeicons/core-free-icons';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { isPortal, PORTAL_HINT, PORTAL_LABEL, PORTALS, UNIVERSITY_NAME } from '@/domain/portals';
import { ROLE_HOME } from '@/domain/roles';
import { getActor } from '@/server/auth/session';
import { LoginForm } from '../LoginForm';

export function generateStaticParams() {
  return PORTALS.map((portal) => ({ portal }));
}

export async function generateMetadata({ params }: { params: Promise<{ portal: string }> }): Promise<Metadata> {
  const { portal } = await params;
  return { title: isPortal(portal) ? PORTAL_LABEL[portal] : 'Sign in' };
}

export default async function PortalLoginPage({ params }: { params: Promise<{ portal: string }> }) {
  const { portal } = await params;
  if (!isPortal(portal)) notFound();
  const actor = await getActor();
  if (actor) redirect(ROLE_HOME[actor.role]);

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 py-12">
      <div className="w-full max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-navy text-cream">
          <Icon icon={Mortarboard01Icon} size={26} />
        </span>
        <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.18em] text-green">{UNIVERSITY_NAME}</p>
        <h1 className="mt-1 text-center text-3xl font-bold text-navy">{PORTAL_LABEL[portal]}</h1>
        <p className="mt-2 text-center text-sm text-ink/55">{PORTAL_HINT[portal]}</p>

        <LoginForm portal={portal} />

        <nav className="mt-10 flex justify-center gap-4 border-t border-ink/10 pt-5 text-xs font-semibold text-ink/50" aria-label="Other portals">
          {PORTALS.filter((p) => p !== portal).map((p) => (
            <Link key={p} href={`/login/${p}`} className="hover:text-navy">
              {PORTAL_LABEL[p]}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
