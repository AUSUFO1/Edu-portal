import { Logout01Icon, Mortarboard01Icon } from '@hugeicons/core-free-icons';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { PORTAL_LABEL, portalFor, UNIVERSITY_NAME } from '@/domain/portals';
import { ROLE_HOME, ROLE_LABEL } from '@/domain/roles';
import { termLabel } from '@/lib/format';
import { signOutAction } from '@/server/actions/auth';
import type { Actor } from '@/server/auth/actor';
import { getDb } from '@/server/db/client';
import { findCurrentSemester } from '@/server/services/academic-calendar';
import { MobileNav } from './MobileNav';
import { NAV } from './nav';
import { NavLinks } from './NavLinks';

export async function AppShell({ actor, children }: { actor: Actor; children: ReactNode }) {
  const semester = await findCurrentSemester(await getDb());
  const items = NAV[actor.role];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="no-print sticky top-0 hidden h-dvh flex-col bg-navy px-4 py-6 text-cream lg:flex">
        <Brand href={ROLE_HOME[actor.role]} portal={PORTAL_LABEL[portalFor(actor.role)]} />
        <nav className="mt-8 flex-1 overflow-y-auto" aria-label="Main">
          <NavLinks items={items} />
        </nav>
        <UserCard actor={actor} />
      </aside>

      <div className="min-w-0">
        <header className="no-print relative flex items-center justify-between gap-3 bg-navy px-4 py-3 text-cream lg:hidden">
          <Brand href={ROLE_HOME[actor.role]} portal={PORTAL_LABEL[portalFor(actor.role)]} />
          <MobileNav items={items} />
        </header>

        <div className="no-print border-b border-ink/10 bg-paper/70 px-4 py-2.5 text-sm backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <span className="text-ink/60">
              {semester ? (
                <>
                  <strong className="text-navy">{semester.sessionName}</strong> · {termLabel(semester.term)} ·{' '}
                  <span className={semester.registrationOpen ? 'font-semibold text-green' : ''}>Registration {semester.registrationOpen ? 'open' : 'closed'}</span>
                </>
              ) : (
                'No active semester'
              )}
            </span>
            <form action={signOutAction} className="flex items-center gap-2 text-ink/60 lg:hidden">
              {actor.firstName} · {ROLE_LABEL[actor.role]}
              <button type="submit" className="font-bold text-navy underline-offset-2 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

function Brand({ href, portal }: { href: string; portal: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-cream text-navy">
        <Icon icon={Mortarboard01Icon} size={20} />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-bold">{UNIVERSITY_NAME}</span>
        <span className="block text-[11px] uppercase tracking-[0.16em] text-cream/60">{portal}</span>
      </span>
    </Link>
  );
}

function UserCard({ actor }: { actor: Actor }) {
  return (
    <div className="mt-6 rounded-2xl bg-white/[0.07] p-3">
      <p className="truncate text-sm font-bold">
        {actor.firstName} {actor.lastName}
      </p>
      <p className="truncate text-xs text-cream/60">{ROLE_LABEL[actor.role]}</p>
      <form action={signOutAction} className="mt-3">
        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 py-1.5 text-xs font-bold hover:bg-white/10">
          <Icon icon={Logout01Icon} size={14} /> Sign out
        </button>
      </form>
    </div>
  );
}
