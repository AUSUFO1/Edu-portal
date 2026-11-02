import type { Metadata } from 'next';
import { CreateStudentForm } from '@/components/admin/PeopleForms';
import { PeopleTable, SearchBox } from '@/components/admin/PeopleTable';
import { PageHeader, Section } from '@/components/ui/primitives';
import { departmentContext } from '@/server/auth/department';
import { listPrograms } from '@/server/services/structure.service';
import { listUsers } from '@/server/services/user.service';

export const metadata: Metadata = { title: 'Students' };

export default async function DepartmentStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const ctx = await departmentContext();
  const [students, programs] = await Promise.all([
    listUsers(ctx.db, { departmentId: ctx.departmentId, role: 'student', search: q.trim().slice(0, 60) || undefined }),
    listPrograms(ctx.db, ctx.departmentId),
  ]);

  return (
    <>
      <PageHeader eyebrow="People" title="Students" description="Students registered in your department." />
      <div className="space-y-6">
        <Section title={`${students.length} student(s)`} actions={<SearchBox value={q} />}>
          <PeopleTable people={students} kind="student" viewerRole="department_admin" />
        </Section>
        <Section title="Register a new student" description="The student signs in with this email and initial password.">
          <CreateStudentForm programs={programs.map((p) => ({ id: p.id, name: `${p.award} ${p.name}` }))} />
        </Section>
      </div>
    </>
  );
}
