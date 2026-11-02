import type { Metadata } from 'next';
import { PrintDocument } from '@/components/PrintDocument';
import { EmptyState } from '@/components/ui/primitives';
import { formatDateTime, termLabel } from '@/lib/format';
import { requirePageRole } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { findCurrentSemester } from '@/server/services/academic-calendar';
import { registeredCourses } from '@/server/services/registration.service';
import { studentProfile } from '@/server/services/user.service';

export const metadata: Metadata = { title: 'Course registration slip' };

export default async function RegistrationSlipPage() {
  const actor = await requirePageRole('student');
  const db = await getDb();
  const [profile, semester] = await Promise.all([studentProfile(db, actor.id), findCurrentSemester(db)]);
  if (!semester) return <EmptyState title="No active semester" />;
  const list = await registeredCourses(db, actor.id, semester.id);
  const units = list.reduce((sum, c) => sum + c.units, 0);

  return (
    <PrintDocument
      title="Course Registration Slip"
      subtitle={`${semester.sessionName} Academic Session · ${termLabel(semester.term)}`}
      details={[
        ['Name', `${profile.lastName.toUpperCase()}, ${profile.firstName}`],
        ['Matric number', profile.matricNumber],
        ['Faculty', profile.facultyName],
        ['Department', profile.departmentName],
        ['Program', `${profile.award} ${profile.programName}`],
        ['Level', profile.level],
      ]}
    >
      <table className="table">
        <thead>
          <tr>
            <th>S/N</th>
            <th>Code</th>
            <th>Title</th>
            <th className="text-right">Units</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c, i) => (
            <tr key={c.code}>
              <td>{i + 1}</td>
              <td className="font-semibold">{c.code}</td>
              <td>{c.title}</td>
              <td className="text-right">{c.units}</td>
              <td className="text-xs">{formatDateTime(c.registeredAt)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="text-right font-bold">
              Total units
            </td>
            <td className="text-right font-bold">{units}</td>
            <td />
          </tr>
        </tfoot>
      </table>
      <div className="mt-12 grid grid-cols-2 gap-10 text-sm">
        <p className="border-t border-ink/40 pt-2 text-center">Student&apos;s signature</p>
        <p className="border-t border-ink/40 pt-2 text-center">Level adviser</p>
      </div>
    </PrintDocument>
  );
}
