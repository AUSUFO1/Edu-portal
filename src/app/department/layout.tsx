import { AppShell } from '@/components/shell/AppShell';
import { requirePageRole } from '@/server/auth/session';

export default async function DepartmentLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePageRole('department_admin');
  return <AppShell actor={actor}>{children}</AppShell>;
}
