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
    <main className="grid min-h-dvh place-items-center bg-white px-5 py-12">
      <div className="w-full max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-navy text-cream">
          <Icon icon={Mortarboard01Icon} size={26} />
        </span>
        <h1 className="mt-6 text-center text-3xl font-bold text-navy">Sign in</h1>
        <p className="mt-2 text-center text-sm text-ink/55">University Portal</p>
        <LoginForm />
      </div>
    </main>
  );
}
