import type { Metadata } from 'next';
import { CoursesView } from '@/components/admin/CoursesView';
import { PageHeader } from '@/components/ui/primitives';
import { departmentContext } from '@/server/auth/department';
import { findCurrentSemester } from '@/server/services/academic-calendar';
import { getDepartment, listCourses, listPrograms } from '@/server/services/structure.service';
import { departmentLecturers } from '@/server/services/user.service';

export const metadata: Metadata = { title: 'Courses' };

export default async function DepartmentCoursesPage() {
  const ctx = await departmentContext();
  const [courses, department, programs, lecturers, semester] = await Promise.all([
    listCourses(ctx.db, ctx.departmentId),
    getDepartment(ctx.db, ctx.departmentId),
    listPrograms(ctx.db, ctx.departmentId),
    departmentLecturers(ctx.db, ctx.departmentId),
    findCurrentSemester(ctx.db),
  ]);

  return (
    <>
      <PageHeader eyebrow={department.name} title="Courses" description="Create courses, offer them for the current semester and assign lecturers." />
      <CoursesView
        courses={courses}
        departments={[{ id: department.id, name: department.name }]}
        programs={programs}
        lecturersByDepartment={{ [department.id]: lecturers }}
        semester={semester}
        showDepartment={false}
      />
    </>
  );
}
