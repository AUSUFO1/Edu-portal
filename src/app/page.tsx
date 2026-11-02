import { redirect } from 'next/navigation';
import { ROLE_HOME } from '@/domain/roles';
import { getActor } from '@/server/auth/session';

export default async function Home() {
  const actor = await getActor();
  redirect(actor ? ROLE_HOME[actor.role] : '/login');
}
