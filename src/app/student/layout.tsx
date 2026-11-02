import { AppShell } from '@/components/shell/AppShell';
import { requirePageRole } from '@/server/auth/session';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePageRole('student');
  return <AppShell actor={actor}>{children}</AppShell>;
}
