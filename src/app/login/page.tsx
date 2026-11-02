import { Mortarboard01Icon } from '@hugeicons/core-free-icons';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { ROLE_HOME } from '@/domain/roles';
import { getActor } from '@/server/auth/session';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  const actor = await getActor();
  if (actor) redirect(ROLE_HOME[actor.role]);

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-green/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 left-10 size-80 rounded-full bg-gold/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-cream text-navy">
            <Icon icon={Mortarboard01Icon} size={24} />
          </span>
          <span className="font-display text-lg font-bold">University Portal</span>
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint">Education Management</p>
          <h1 className="mt-3 text-5xl font-bold leading-[1.05]">Registration, results and records in one place.</h1>
          <p className="mt-4 text-cream/70">Students register courses, lecturers submit scores, departments approve results, and the registry oversees it all.</p>
        </div>
        <p className="relative text-sm text-cream/50">Access is restricted to university staff and students.</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid size-11 place-items-center rounded-2xl bg-navy text-cream">
              <Icon icon={Mortarboard01Icon} size={24} />
            </span>
          </div>
          <h2 className="text-3xl font-bold text-navy">Sign in</h2>
          <p className="mt-2 text-ink/60">Use the email and password issued by your department.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
