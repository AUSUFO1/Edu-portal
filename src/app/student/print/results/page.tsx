import type { Metadata } from 'next';
import { PrintDocument } from '@/components/PrintDocument';
import { DEFAULT_GRADE_SCALE } from '@/domain/grading';
import { formatScore, termLabel } from '@/lib/format';
import { requirePageRole } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { academicRecord } from '@/server/services/academic-record.service';
import { studentProfile } from '@/server/services/user.service';

export const metadata: Metadata = { title: 'Statement of result' };

export default async function ResultStatementPage() {
  const actor = await requirePageRole('student');
  const db = await getDb();
  const [profile, record] = await Promise.all([studentProfile(db, actor.id), academicRecord(db, actor.id)]);

  return (
    <PrintDocument
      title="Statement of Result"
      subtitle="Approved results only"
      details={[
        ['Name', `${profile.lastName.toUpperCase()}, ${profile.firstName}`],
        ['Matric number', profile.matricNumber],
        ['Department', profile.departmentName],
        ['Program', `${profile.award} ${profile.programName}`],
        ['CGPA', record.totalUnits ? record.cgpa.toFixed(2) : '—'],
        ['Standing', record.standing ?? '—'],
      ]}
    >
      <div className="space-y-6">
        {record.semesters.map((s) => (
          <section key={s.semesterId} className="break-inside-avoid">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy">
              {s.sessionName} · {termLabel(s.term)}
            </h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th className="text-right">Units</th>
                  <th className="text-right">CA</th>
                  <th className="text-right">Exam</th>
                  <th className="text-right">Total</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {s.courses.map((c) => (
                  <tr key={c.code}>
                    <td>{c.code}</td>
                    <td>{c.title}</td>
                    <td className="text-right">{c.units}</td>
                    <td className="text-right">{formatScore(c.caScore)}</td>
                    <td className="text-right">{formatScore(c.examScore)}</td>
                    <td className="text-right">{c.total}</td>
                    <td className="font-bold">{c.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-right text-sm">
              Units: <strong>{s.units}</strong> · GPA: <strong>{s.gpa.toFixed(2)}</strong> · CGPA: <strong>{s.cgpa.toFixed(2)}</strong>
            </p>
          </section>
        ))}
      </div>
      <p className="mt-8 text-xs text-ink/55">
        Grading: {DEFAULT_GRADE_SCALE.map((b) => `${b.grade} ${b.minScore}-${b.maxScore} (${b.point})`).join(' · ')}. GPA = Σ(units × grade point) ÷ Σ units.
      </p>
    </PrintDocument>
  );
}
