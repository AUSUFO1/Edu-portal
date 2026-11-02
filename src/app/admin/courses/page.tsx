import type { Metadata } from 'next';
import { CoursesView } from '@/components/admin/CoursesView';
import { DepartmentFilter } from '@/components/admin/DepartmentFilter';
import { PageHeader } from '@/components/ui/primitives';
import { departmentFilter } from '@/server/auth/admin-scope';
import { serviceContext } from '@/server/auth/session';
import { findCurrentSemester } from '@/server/services/academic-calendar';
import { listCourses, listDepartments, listPrograms } from '@/server/services/structure.service';
import { departmentLecturers } from '@/server/services/user.service';

export const metadata: Metadata = { title: 'Courses' };

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<{ department?: string }> }) {
  const departmentId = departmentFilter((await searchParams).department);
  const ctx = await serviceContext('super_admin');
  const [courses, departments, programs, semester] = await Promise.all([
    listCourses(ctx.db, departmentId),
    listDepartments(ctx.db),
    listPrograms(ctx.db),
    findCurrentSemester(ctx.db),
  ]);
  const lecturers = Object.fromEntries(await Promise.all(departments.map(async (d) => [d.id, await departmentLecturers(ctx.db, d.id)] as const)));

  return (
    <>
      <PageHeader eyebrow="Academics" title="Courses & allocations" description="Every course in the university, what is offered this semester and who teaches it." actions={<DepartmentFilter departments={departments} value={departmentId} />} />
      <CoursesView courses={courses} departments={departments} programs={programs} lecturersByDepartment={lecturers} semester={semester} showDepartment />
    </>
  );
}
