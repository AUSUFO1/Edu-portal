import { Book02Icon, DocumentValidationIcon, LeftToRightListBulletIcon, StudentCardIcon, TeacherIcon } from '@hugeicons/core-free-icons';
import Link from 'next/link';
import { ResultQueue } from '@/components/admin/ResultQueue';
import { PageHeader, Section, StatCard } from '@/components/ui/primitives';
import { departmentContext } from '@/server/auth/department';
import { overview } from '@/server/services/report.service';
import { listSheets } from '@/server/services/result.service';
import { getDepartment } from '@/server/services/structure.service';

export default async function DepartmentDashboard() {
  const ctx = await departmentContext();
  const [department, stats, pending] = await Promise.all([
    getDepartment(ctx.db, ctx.departmentId),
    overview(ctx, ctx.departmentId),
    listSheets(ctx, { departmentId: ctx.departmentId, status: 'submitted' }),
  ]);

  return (
    <>
      <PageHeader eyebrow={department.facultyName} title={department.name} description="Manage students, lecturers and courses, and approve results submitted by lecturers." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pending approval" value={stats.pending} icon={DocumentValidationIcon} tone={stats.pending ? 'attention' : 'default'} />
        <StatCard label="Students" value={stats.students} icon={StudentCardIcon} />
        <StatCard label="Lecturers" value={stats.lecturers} icon={TeacherIcon} />
        <StatCard label="Active courses" value={stats.courses} icon={Book02Icon} />
        <StatCard label="Registrations" value={stats.registrations} hint="This semester" icon={LeftToRightListBulletIcon} />
      </div>
      <Section
        className="mt-6"
        title="Awaiting your approval"
        actions={
          <Link href="/department/results" className="btn btn-secondary btn-sm">
            All results
          </Link>
        }
      >
        <ResultQueue sheets={pending} basePath="/department/results" />
      </Section>
    </>
  );
}
