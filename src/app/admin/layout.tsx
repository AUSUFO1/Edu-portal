import { AppShell } from '@/components/shell/AppShell';
import { requirePageRole } from '@/server/auth/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePageRole('super_admin');
  return <AppShell actor={actor}>{children}</AppShell>;
}
