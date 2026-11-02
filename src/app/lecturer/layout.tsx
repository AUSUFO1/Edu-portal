import { AppShell } from '@/components/shell/AppShell';
import { requirePageRole } from '@/server/auth/session';

export default async function LecturerLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePageRole('lecturer');
  return <AppShell actor={actor}>{children}</AppShell>;
}
