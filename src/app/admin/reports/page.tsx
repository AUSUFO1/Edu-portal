import type { Metadata } from 'next';
import { DepartmentFilter } from '@/components/admin/DepartmentFilter';
import { EnrolmentTable, PerformanceTable } from '@/components/admin/ReportViews';
import { PageHeader, Section } from '@/components/ui/primitives';
import { departmentFilter } from '@/server/auth/admin-scope';
import { serviceContext } from '@/server/auth/session';
import { enrolmentByLevel, performanceReport } from '@/server/services/report.service';
import { listDepartments } from '@/server/services/structure.service';

export const metadata: Metadata = { title: 'Reports' };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ department?: string }> }) {
  const departmentId = departmentFilter((await searchParams).department);
  const ctx = await serviceContext('super_admin');
  const [enrolment, performance, departments] = await Promise.all([enrolmentByLevel(ctx, departmentId), performanceReport(ctx, departmentId), listDepartments(ctx.db)]);
  return (
    <>
      <PageHeader eyebrow="Reports" title="Academic reports" description="University-wide enrolment and course performance." actions={<DepartmentFilter departments={departments} value={departmentId} />} />
      <div className="space-y-6">
        <Section title="Students by department and level">
          <EnrolmentTable rows={enrolment} />
        </Section>
        <Section title="Course performance" description="Approved results only.">
          <PerformanceTable rows={performance} showDepartment />
        </Section>
      </div>
    </>
  );
}
