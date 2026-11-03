import { EmptyState, Table } from '@/components/ui/primitives';
import { AccountStatusBadge } from '@/components/ui/status';
import { ROLE_LABEL } from '@/domain/roles';
import { formatDateTime } from '@/lib/format';
import type { listUsers } from '@/server/services/user.service';
import { AccountControls } from './PeopleForms';

type Person = Awaited<ReturnType<typeof listUsers>>[number];

export function PeopleTable({ people, kind, viewerRole }: { people: Person[]; kind: 'student' | 'lecturer' | 'any'; viewerRole: 'department_admin' | 'super_admin' }) {
  if (people.length === 0) return <EmptyState title="No people found" description="Try a different search, or create the first record below." />;
  return (
    <Table>
      <thead>
        <tr>
          <th>Name</th>
          {kind === 'student' && <th>Matric number</th>}
          {kind === 'student' && <th>Program · Level</th>}
          {kind === 'lecturer' && <th>Staff number</th>}
          {kind === 'lecturer' && <th>Rank</th>}
          {kind === 'any' && <th>Role</th>}
          {kind === 'any' && <th>Department</th>}
          <th>Status</th>
          <th>Last sign-in</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {people.map((p) => {
          // Department admins manage passwords for their students and lecturers only.
          const manageable = viewerRole === 'super_admin' || p.role === 'student' || p.role === 'lecturer';
          return (
            <tr key={p.id}>
              <td>
                <p className="font-semibold">
                  {p.title ? `${p.title} ` : ''}
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-xs text-ink/55">{p.email}</p>
              </td>
              {kind === 'student' && <td className="font-mono text-xs">{p.matricNumber}</td>}
              {kind === 'student' && (
                <td>
                  {p.programName} · {p.level}
                </td>
              )}
              {kind === 'lecturer' && <td className="font-mono text-xs">{p.staffNumber}</td>}
              {kind === 'lecturer' && <td>{p.rank}</td>}
              {kind === 'any' && <td>{ROLE_LABEL[p.role]}</td>}
              {kind === 'any' && <td>{p.departmentName ?? 'University-wide'}</td>}
              <td>
                <AccountStatusBadge status={p.status} />
              </td>
              <td className="whitespace-nowrap text-xs">{formatDateTime(p.lastLoginAt)}</td>
              <td className="text-right">{manageable && <AccountControls userId={p.id} status={p.status} role={p.role} canManageAccounts={viewerRole === 'super_admin'} />}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export function SearchBox({ value, extra }: { value: string; extra?: Record<string, string> }) {
  return (
    <form method="get" className="no-print flex w-full gap-2 sm:w-auto">
      {Object.entries(extra ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="search" name="q" defaultValue={value} placeholder="Search name, email or number" className="input h-9 min-w-0 flex-1 sm:w-64 sm:flex-none" aria-label="Search" />
      <button type="submit" className="btn btn-secondary btn-sm">
        Search
      </button>
    </form>
  );
}
