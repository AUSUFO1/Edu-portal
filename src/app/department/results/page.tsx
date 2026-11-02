import type { Metadata } from 'next';
import { ResultQueue, SHEET_FILTERS, StatusTabs } from '@/components/admin/ResultQueue';
import { PageHeader, Section } from '@/components/ui/primitives';
import type { SheetStatus } from '@/domain/result-sheet';
import { departmentContext } from '@/server/auth/department';
import { listSheets } from '@/server/services/result.service';

export const metadata: Metadata = { title: 'Result approvals' };

export default async function DepartmentResultsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: requested } = await searchParams;
  const status = SHEET_FILTERS.some((f) => f.value === requested) ? requested! : 'submitted';
  const ctx = await departmentContext();
  const sheets = await listSheets(ctx, { departmentId: ctx.departmentId, status: status === 'all' ? undefined : (status as SheetStatus) });

  return (
    <>
      <PageHeader eyebrow="Results" title="Result approvals" description="Review results submitted by lecturers. Approved results become visible to students; returned results go back to the lecturer with your comment." />
      <StatusTabs basePath="/department/results" current={status} />
      <Section>
        <ResultQueue sheets={sheets} basePath="/department/results" />
      </Section>
    </>
  );
}
