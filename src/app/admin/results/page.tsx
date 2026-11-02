import type { Metadata } from 'next';
import { DepartmentFilter } from '@/components/admin/DepartmentFilter';
import { ResultQueue, SHEET_FILTERS, StatusTabs } from '@/components/admin/ResultQueue';
import { PageHeader, Section } from '@/components/ui/primitives';
import type { SheetStatus } from '@/domain/result-sheet';
import { departmentFilter } from '@/server/auth/admin-scope';
import { serviceContext } from '@/server/auth/session';
import { listSheets } from '@/server/services/result.service';
import { listDepartments } from '@/server/services/structure.service';

export const metadata: Metadata = { title: 'Result approvals' };

export default async function AdminResultsPage({ searchParams }: { searchParams: Promise<{ status?: string; department?: string }> }) {
  const params = await searchParams;
  const status = SHEET_FILTERS.some((f) => f.value === params.status) ? params.status! : 'submitted';
  const departmentId = departmentFilter(params.department);
  const ctx = await serviceContext('super_admin');
  const [sheets, departments] = await Promise.all([
    listSheets(ctx, { departmentId, status: status === 'all' ? undefined : (status as SheetStatus) }),
    listDepartments(ctx.db),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Oversight"
        title="Result approvals"
        description="Departmental result approvals across the university. Approval decisions are made by each department's admin."
        actions={<DepartmentFilter departments={departments} value={departmentId} />}
      />
      <StatusTabs basePath="/admin/results" current={status} extraQuery={departmentId ? `&department=${departmentId}` : ''} />
      <Section>
        <ResultQueue sheets={sheets} basePath="/admin/results" showDepartment />
      </Section>
    </>
  );
}
