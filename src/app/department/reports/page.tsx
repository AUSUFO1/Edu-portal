import type { Metadata } from 'next';
import { EnrolmentTable, PerformanceTable } from '@/components/admin/ReportViews';
import { PageHeader, Section } from '@/components/ui/primitives';
import { departmentContext } from '@/server/auth/department';
import { enrolmentByLevel, performanceReport } from '@/server/services/report.service';

export const metadata: Metadata = { title: 'Reports' };

export default async function DepartmentReportsPage() {
  const ctx = await departmentContext();
  const [enrolment, performance] = await Promise.all([enrolmentByLevel(ctx, ctx.departmentId), performanceReport(ctx, ctx.departmentId)]);
  return (
    <>
      <PageHeader eyebrow="Reports" title="Department reports" description="Student numbers by level and performance in approved course results." />
      <div className="space-y-6">
        <Section title="Students by level">
          <EnrolmentTable rows={enrolment} />
        </Section>
        <Section title="Course performance" description="Approved results only.">
          <PerformanceTable rows={performance} />
        </Section>
      </div>
    </>
  );
}
