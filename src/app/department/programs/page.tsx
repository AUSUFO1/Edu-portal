import type { Metadata } from 'next';
import { ProgramsView } from '@/components/admin/ProgramsView';
import { PageHeader } from '@/components/ui/primitives';
import { departmentContext } from '@/server/auth/department';
import { getDepartment, listPrograms } from '@/server/services/structure.service';

export const metadata: Metadata = { title: 'Programs' };

export default async function DepartmentProgramsPage() {
  const ctx = await departmentContext();
  const [programs, department] = await Promise.all([listPrograms(ctx.db, ctx.departmentId), getDepartment(ctx.db, ctx.departmentId)]);
  return (
    <>
      <PageHeader eyebrow={department.name} title="Programs" description="Degree programs run by your department. Courses are attached to programs, which decides who can register them." />
      <ProgramsView programs={programs} departments={[{ id: department.id, name: department.name }]} showDepartment={false} />
    </>
  );
}
