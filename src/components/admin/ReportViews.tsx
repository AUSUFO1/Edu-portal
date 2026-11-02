import Link from 'next/link';
import { EmptyState, Section, Table } from '@/components/ui/primitives';
import { formatDateTime, termLabel } from '@/lib/format';
import type { enrolmentByLevel, offeringRegistrations, performanceReport, registrationReport } from '@/server/services/report.service';

type Rows<F extends (...args: never[]) => unknown> = Awaited<ReturnType<F>>;

export function RegistrationsTable({ rows, basePath, showDepartment, query = '' }: { rows: Rows<typeof registrationReport>; basePath: string; showDepartment?: boolean; query?: string }) {
  if (rows.length === 0) return <EmptyState title="No courses offered this semester" />;
  return (
    <Table>
      <thead>
        <tr>
          <th>Course</th>
          {showDepartment && <th>Department</th>}
          <th>Level</th>
          <th className="text-right">Units</th>
          <th className="text-right">Registered</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.offeringId}>
            <td>
              <span className="font-semibold">{r.code}</span> <span className="text-ink/65">{r.title}</span>
            </td>
            {showDepartment && <td>{r.departmentName}</td>}
            <td>{r.level}</td>
            <td className="text-right">{r.units}</td>
            <td className="text-right font-semibold">{r.registered}</td>
            <td className="text-right">
              <Link href={`${basePath}?offering=${r.offeringId}${query}`} className="btn btn-secondary btn-sm">
                Class list
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function ClassList({ data }: { data: NonNullable<Rows<typeof offeringRegistrations>> }) {
  return (
    <Section title={`${data.offering.code} · ${data.offering.title}`} description={`${data.students.length} student(s) registered`}>
      {data.students.length === 0 ? (
        <EmptyState title="No registrations yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>#</th>
              <th>Matric number</th>
              <th>Name</th>
              <th>Level</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((s, i) => (
              <tr key={s.matricNumber}>
                <td className="text-ink/50">{i + 1}</td>
                <td className="font-semibold">{s.matricNumber}</td>
                <td>
                  {s.lastName}, {s.firstName}
                </td>
                <td>{s.level}</td>
                <td className="text-xs">{formatDateTime(s.registeredAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Section>
  );
}

export function EnrolmentTable({ rows }: { rows: Rows<typeof enrolmentByLevel> }) {
  if (rows.length === 0) return <EmptyState title="No students yet" />;
  const levels = [...new Set(rows.map((r) => r.level))].sort();
  const departments = [...new Set(rows.map((r) => r.departmentName))];
  return (
    <Table>
      <thead>
        <tr>
          <th>Department</th>
          {levels.map((l) => (
            <th key={l} className="text-right">
              {l}L
            </th>
          ))}
          <th className="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {departments.map((d) => {
          const counts = levels.map((l) => rows.find((r) => r.departmentName === d && r.level === l)?.count ?? 0);
          return (
            <tr key={d}>
              <td className="font-semibold">{d}</td>
              {counts.map((c, i) => (
                <td key={levels[i]} className="text-right">
                  {c || '—'}
                </td>
              ))}
              <td className="text-right font-bold">{counts.reduce((a, b) => a + b, 0)}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export function PerformanceTable({ rows, showDepartment }: { rows: Rows<typeof performanceReport>; showDepartment?: boolean }) {
  if (rows.length === 0) return <EmptyState title="No approved results yet" description="Course performance appears once results are approved." />;
  return (
    <Table>
      <thead>
        <tr>
          <th>Course</th>
          {showDepartment && <th>Department</th>}
          <th>Session</th>
          <th className="text-right">Students</th>
          <th className="text-right">Average</th>
          <th className="text-right">Pass rate</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.code}-${r.sessionName}-${r.term}`}>
            <td>
              <span className="font-semibold">{r.code}</span> <span className="text-ink/65">{r.title}</span>
            </td>
            {showDepartment && <td>{r.departmentName}</td>}
            <td className="whitespace-nowrap">
              {r.sessionName} · {termLabel(r.term)}
            </td>
            <td className="text-right">{r.students}</td>
            <td className="text-right">{r.average}</td>
            <td className={`text-right font-semibold ${r.passRate < 50 ? 'text-danger' : 'text-green'}`}>{r.passRate}%</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
