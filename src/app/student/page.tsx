import Link from 'next/link';
import { Badge, PageHeader, Section, StatCard, Table, EmptyState } from '@/components/ui/primitives';
import { termLabel } from '@/lib/format';
import { requirePageRole } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { findCurrentSemester } from '@/server/services/academic-calendar';
import { academicRecord } from '@/server/services/academic-record.service';
import { registeredCourses } from '@/server/services/registration.service';
import { studentProfile } from '@/server/services/user.service';

export default async function StudentDashboard() {
  const actor = await requirePageRole('student');
  const db = await getDb();
  const [profile, semester, record] = await Promise.all([studentProfile(db, actor.id), findCurrentSemester(db), academicRecord(db, actor.id)]);
  const current = semester ? await registeredCourses(db, actor.id, semester.id) : [];
  const units = current.reduce((sum, c) => sum + c.units, 0);

  return (
    <>
      <PageHeader eyebrow={profile.matricNumber} title={`Welcome, ${profile.firstName}`} description={`${profile.programName} · ${profile.departmentName} · ${profile.facultyName}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Level" value={profile.level} hint={`Entry year ${profile.entryYear}`} />
        <StatCard label="CGPA" value={record.totalUnits ? record.cgpa.toFixed(2) : '—'} hint={record.standing ?? 'No approved results yet'} />
        <StatCard label="Courses this semester" value={current.length} hint={`${units} units registered`} />
        <StatCard label="Units completed" value={record.totalUnits} hint="From approved results" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Section
          title="Registered courses"
          description={semester ? `${semester.sessionName} · ${termLabel(semester.term)}` : 'No active semester'}
          actions={
            <div className="flex gap-2">
              {current.length > 0 && (
                <Link href="/student/print/registration" className="btn btn-secondary btn-sm">
                  Print slip
                </Link>
              )}
              <Link href="/student/courses" className="btn btn-primary btn-sm">
                {semester?.registrationOpen ? 'Register courses' : 'View courses'}
              </Link>
            </div>
          }
        >
          {current.length === 0 ? (
            <EmptyState title="No courses registered" description={semester?.registrationOpen ? 'Registration is open. Choose your courses for this semester.' : 'Registration is currently closed.'} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th className="text-right">Units</th>
                </tr>
              </thead>
              <tbody>
                {current.map((c) => (
                  <tr key={c.code}>
                    <td className="font-semibold">{c.code}</td>
                    <td>{c.title}</td>
                    <td className="text-right">{c.units}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Section>

        <Section title="Academic progress" actions={<Link href="/student/results" className="btn btn-secondary btn-sm">All results</Link>}>
          {record.semesters.length === 0 ? (
            <EmptyState title="No results yet" description="Results appear here once your department approves them." />
          ) : (
            <ul className="space-y-3">
              {record.semesters
                .slice()
                .reverse()
                .map((s) => (
                  <li key={s.semesterId} className="flex items-center justify-between rounded-xl bg-ink/[0.03] px-4 py-3">
                    <div>
                      <p className="font-semibold text-navy">{s.sessionName}</p>
                      <p className="text-xs text-ink/55">
                        {termLabel(s.term)} · {s.units} units
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge tone="green">GPA {s.gpa.toFixed(2)}</Badge>
                      <p className="mt-1 text-xs text-ink/55">CGPA {s.cgpa.toFixed(2)}</p>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
