import Link from 'next/link';
import { EmptyState, Table } from '@/components/ui/primitives';
import { SheetStatusBadge } from '@/components/ui/status';
import { formatDateTime, termLabel } from '@/lib/format';
import type { listSheets } from '@/server/services/result.service';

type Sheet = Awaited<ReturnType<typeof listSheets>>[number];

export function ResultQueue({ sheets, basePath, showDepartment }: { sheets: Sheet[]; basePath: string; showDepartment?: boolean }) {
  if (sheets.length === 0) return <EmptyState title="Nothing here" description="No result sheets match this view." />;
  return (
    <Table>
      <thead>
        <tr>
          <th>Course</th>
          {showDepartment && <th>Department</th>}
          <th>Session</th>
          <th>Submitted by</th>
          <th>Submitted</th>
          <th className="text-right">Students</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {sheets.map((s) => (
          <tr key={s.sheetId}>
            <td>
              <span className="font-semibold">{s.code}</span> <span className="text-ink/65">{s.title}</span>
            </td>
            {showDepartment && <td>{s.departmentName}</td>}
            <td className="whitespace-nowrap">
              {s.sessionName} · {termLabel(s.term)}
            </td>
            <td>{s.submittedBy ?? '—'}</td>
            <td className="whitespace-nowrap text-xs">{formatDateTime(s.submittedAt)}</td>
            <td className="text-right">{s.students}</td>
            <td>
              <SheetStatusBadge status={s.status} />
            </td>
            <td className="text-right">
              <Link href={`${basePath}/${s.sheetId}`} className="btn btn-secondary btn-sm">
                {s.status === 'submitted' ? 'Review' : 'View'}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export const SHEET_FILTERS = [
  { value: 'submitted', label: 'Awaiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Returned' },
  { value: 'draft', label: 'Drafts' },
  { value: 'all', label: 'All' },
] as const;

export function StatusTabs({ basePath, current, extraQuery = '' }: { basePath: string; current: string; extraQuery?: string }) {
  return (
    <nav className="no-print mb-4 flex flex-wrap gap-2" aria-label="Filter by status">
      {SHEET_FILTERS.map((f) => (
        <Link
          key={f.value}
          href={`${basePath}?status=${f.value}${extraQuery}`}
          aria-current={current === f.value ? 'page' : undefined}
          className={`btn btn-sm ${current === f.value ? 'btn-primary' : 'btn-secondary'}`}
        >
          {f.label}
        </Link>
      ))}
    </nav>
  );
}
