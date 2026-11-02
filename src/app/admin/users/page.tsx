import type { Metadata } from 'next';
import Link from 'next/link';
import { CreateAdminForm, CreateLecturerForm, CreateStudentForm } from '@/components/admin/PeopleForms';
import { PeopleTable, SearchBox } from '@/components/admin/PeopleTable';
import { PageHeader, Section } from '@/components/ui/primitives';
import { ROLES, type Role } from '@/domain/roles';
import { serviceContext } from '@/server/auth/session';
import { listDepartments, listPrograms } from '@/server/services/structure.service';
import { listUsers } from '@/server/services/user.service';

export const metadata: Metadata = { title: 'Users' };

const TABS: { value: Role | 'all'; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'student', label: 'Students' },
  { value: 'lecturer', label: 'Lecturers' },
  { value: 'department_admin', label: 'Department admins' },
  { value: 'super_admin', label: 'Super admins' },
];

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const { role: requested, q = '' } = await searchParams;
  const role = (ROLES as readonly string[]).includes(requested ?? '') ? (requested as Role) : undefined;
  const ctx = await serviceContext('super_admin');
  const [people, departments, programs] = await Promise.all([
    listUsers(ctx.db, { role, search: q.trim().slice(0, 60) || undefined }),
    listDepartments(ctx.db),
    listPrograms(ctx.db),
  ]);
  const kind = role === 'student' ? 'student' : role === 'lecturer' ? 'lecturer' : 'any';

  return (
    <>
      <PageHeader eyebrow="Accounts" title="Users" description="Create accounts, suspend or deactivate them, change staff roles and reset passwords. Every change is logged and signs the user out." />
      <nav className="no-print mb-4 flex flex-wrap gap-2" aria-label="Filter by role">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === 'all' ? '/admin/users' : `/admin/users?role=${t.value}`}
            aria-current={(role ?? 'all') === t.value ? 'page' : undefined}
            className={`btn btn-sm ${(role ?? 'all') === t.value ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-6">
        <Section title={`${people.length} account(s)`} actions={<SearchBox value={q} extra={role ? { role } : undefined} />}>
          <PeopleTable people={people} kind={kind} viewerRole="super_admin" />
        </Section>
        <Section title="Create a student">
          <CreateStudentForm programs={programs.map((p) => ({ id: p.id, name: `${p.award} ${p.name} (${p.departmentName})` }))} />
        </Section>
        <Section title="Create a lecturer">
          <CreateLecturerForm departments={departments} />
        </Section>
        <Section title="Create an administrator">
          <CreateAdminForm departments={departments} />
        </Section>
      </div>
    </>
  );
}
