import type { Metadata } from 'next';
import { PageHeader, Section, Table } from '@/components/ui/primitives';
import { ROLE_LABEL } from '@/domain/roles';
import { formatDateTime } from '@/lib/format';
import { serviceContext } from '@/server/auth/session';
import { recentActivity } from '@/server/services/report.service';

export const metadata: Metadata = { title: 'Activity log' };

export default async function AuditPage() {
  const ctx = await serviceContext('super_admin');
  const entries = await recentActivity(ctx, 200);

  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Activity log"
        description="Every sign-in, account change, registration, score change, submission, approval and rejection. The log is append-only: the database refuses edits and deletions."
      />
      <Section title="Latest 200 entries">
        <Table>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Record</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</td>
                <td className="whitespace-nowrap">
                  <p className="font-semibold">{e.actorName ?? 'System'}</p>
                  {e.actorRole && <p className="text-xs text-ink/55">{ROLE_LABEL[e.actorRole]}</p>}
                </td>
                <td className="font-mono text-xs">{e.action}</td>
                <td className="text-xs">
                  {e.entityType}
                  <span className="block font-mono text-[10px] text-ink/45">{e.entityId.slice(0, 13)}</span>
                </td>
                <td className="max-w-md">
                  <code className="block truncate text-[11px] text-ink/65" title={JSON.stringify(e.details)}>
                    {JSON.stringify(e.details)}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>
    </>
  );
}
