import Link from 'next/link';
import { Badge, EmptyState, PageHeader, Section, StatCard, Table } from '@/components/ui/primitives';
import { SheetStatusBadge } from '@/components/ui/status';
import { termLabel } from '@/lib/format';
import { serviceContext } from '@/server/auth/session';
import { lecturerCourses } from '@/server/services/result.service';

export default async function LecturerHome() {
  const ctx = await serviceContext('lecturer');
  const list = await lecturerCourses(ctx);
  const current = list.filter((c) => c.isCurrent);
  const students = current.reduce((sum, c) => sum + c.students, 0);
  const toDo = current.filter((c) => c.status === null || c.status === 'draft' || c.status === 'rejected').length;
  const returned = current.filter((c) => c.status === 'rejected').length;

  return (
    <>
      <PageHeader eyebrow="Lecturer" title={`Good day, ${ctx.actor.firstName}`} description="Enter continuous assessment and examination scores for your courses, save drafts, and submit them for departmental approval." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Courses this semester" value={current.length} />
        <StatCard label="Students" value={students} hint="Across your current courses" />
        <StatCard label="Results to submit" value={toDo} hint={returned ? `${returned} returned for correction` : undefined} tone={returned ? 'attention' : 'default'} />
      </div>

      <Section title="Assigned courses">
        {list.length === 0 ? (
          <EmptyState title="No courses assigned" description="Your department admin assigns courses to you each semester." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Session</th>
                <th className="text-right">Units</th>
                <th className="text-right">Students</th>
                <th>Results</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.offeringId}>
                  <td>
                    <span className="font-semibold">{c.code}</span> <span className="text-ink/65">{c.title}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    {c.sessionName} · {termLabel(c.term)} {c.isCurrent && <Badge tone="navy">Current</Badge>}
                  </td>
                  <td className="text-right">{c.units}</td>
                  <td className="text-right">{c.students}</td>
                  <td>
                    <SheetStatusBadge status={c.status} />
                  </td>
                  <td className="text-right">
                    <Link href={`/lecturer/courses/${c.offeringId}`} className="btn btn-secondary btn-sm">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </>
  );
}
