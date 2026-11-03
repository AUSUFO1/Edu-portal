import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, EmptyState, PageHeader, Section, StatCard, Table } from '@/components/ui/primitives';
import { formatScore, termLabel } from '@/lib/format';
import { requirePageRole } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { academicRecord } from '@/server/services/academic-record.service';

export const metadata: Metadata = { title: 'Results' };

export default async function StudentResultsPage() {
  const actor = await requirePageRole('student');
  const record = await academicRecord(await getDb(), actor.id);

  return (
    <>
      <PageHeader
        eyebrow="Academic record"
        title="Results"
        description="Only results approved by your department appear here. GPA is credit-unit weighted on a 5-point scale."
        actions={
          record.semesters.length > 0 && (
            <Link href="/student/print/results" className="btn btn-secondary">
              Print statement
            </Link>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <StatCard label="CGPA" value={record.totalUnits ? record.cgpa.toFixed(2) : '—'} />
        <StatCard label="Standing" value={<span className="text-base sm:text-2xl">{record.standing ?? '—'}</span>} />
        <StatCard label="Units completed" value={record.totalUnits} />
      </div>

      {record.semesters.length === 0 ? (
        <EmptyState title="No approved results yet" description="When your department approves a course result it will appear here." />
      ) : (
        <div className="space-y-6">
          {record.semesters
            .slice()
            .reverse()
            .map((s) => (
              <Section
                key={s.semesterId}
                title={`${s.sessionName} · ${termLabel(s.term)}`}
                actions={
                  <div className="flex gap-2">
                    <Badge tone="green">GPA {s.gpa.toFixed(2)}</Badge>
                    <Badge tone="navy">CGPA {s.cgpa.toFixed(2)}</Badge>
                  </div>
                }
              >
                <Table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th className="text-right">Units</th>
                      <th className="text-right">CA</th>
                      <th className="text-right">Exam</th>
                      <th className="text-right">Total</th>
                      <th className="text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.courses.map((c) => (
                      <tr key={c.code}>
                        <td className="font-semibold">{c.code}</td>
                        <td>{c.title}</td>
                        <td className="text-right">{c.units}</td>
                        <td className="text-right">{formatScore(c.caScore)}</td>
                        <td className="text-right">{formatScore(c.examScore)}</td>
                        <td className="text-right font-semibold">{c.total}</td>
                        <td className="text-center">
                          <Badge tone={c.gradePoint === 0 ? 'red' : 'green'}>{c.grade}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Section>
            ))}
        </div>
      )}
    </>
  );
}
