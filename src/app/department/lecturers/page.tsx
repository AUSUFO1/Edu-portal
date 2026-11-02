import type { Metadata } from 'next';
import { CreateLecturerForm } from '@/components/admin/PeopleForms';
import { PeopleTable, SearchBox } from '@/components/admin/PeopleTable';
import { PageHeader, Section } from '@/components/ui/primitives';
import { departmentContext } from '@/server/auth/department';
import { getDepartment } from '@/server/services/structure.service';
import { listUsers } from '@/server/services/user.service';

export const metadata: Metadata = { title: 'Lecturers' };

export default async function DepartmentLecturersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const ctx = await departmentContext();
  const [lecturers, department] = await Promise.all([
    listUsers(ctx.db, { departmentId: ctx.departmentId, role: 'lecturer', search: q.trim().slice(0, 60) || undefined }),
    getDepartment(ctx.db, ctx.departmentId),
  ]);

  return (
    <>
      <PageHeader eyebrow="People" title="Lecturers" description="Lecturer profiles in your department. Assign them to courses from the Courses page." />
      <div className="space-y-6">
        <Section title={`${lecturers.length} lecturer(s)`} actions={<SearchBox value={q} />}>
          <PeopleTable people={lecturers} kind="lecturer" viewerRole="department_admin" />
        </Section>
        <Section title="Add a lecturer">
          <CreateLecturerForm departments={[{ id: department.id, name: department.name }]} />
        </Section>
      </div>
    </>
  );
}
