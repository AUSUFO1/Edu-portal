import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Notice, PageHeader, Section, StatCard } from '@/components/ui/primitives';
import { SheetStatusBadge } from '@/components/ui/status';
import { AppError } from '@/domain/errors';
import { isEditableByLecturer } from '@/domain/result-sheet';
import { formatDateTime, termLabel } from '@/lib/format';
import { serviceContext } from '@/server/auth/session';
import { lecturerSheet } from '@/server/services/result.service';
import { ScoreSheet } from './ScoreSheet';

export default async function LecturerCoursePage({ params }: { params: Promise<{ offeringId: string }> }) {
  const { offeringId } = await params;
  if (!z.uuid().safeParse(offeringId).success) notFound();

  const ctx = await serviceContext('lecturer');
  const data = await lecturerSheet(ctx, offeringId).catch((error: unknown) => {
    if (error instanceof AppError && (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND')) notFound();
    throw error;
  });
  const { offering, rows, sheet, status } = data;
  const scored = rows.filter((r) => r.caScore !== null);
  const passed = scored.filter((r) => (r.gradePoint ?? 0) > 0).length;
  const average = scored.length ? scored.reduce((sum, r) => sum + r.caScore! + r.examScore!, 0) / scored.length : 0;

  return (
    <>
      <PageHeader
        eyebrow={`${offering.sessionName} · ${termLabel(offering.term)}`}
        title={`${offering.code} · ${offering.title}`}
        description={`${offering.units} units · ${offering.level} level · ${offering.departmentName}`}
        actions={
          <Link href="/lecturer" className="btn btn-secondary">
            All courses
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Status" value={<SheetStatusBadge status={sheet ? status : null} />} hint={sheet?.submittedAt ? `Submitted ${formatDateTime(sheet.submittedAt)}` : undefined} />
        <StatCard label="Registered" value={rows.length} />
        <StatCard label="Scored" value={`${scored.length}/${rows.length}`} />
        <StatCard label="Pass rate" value={scored.length ? `${Math.round((passed / scored.length) * 100)}%` : '—'} hint={scored.length ? `Average ${average.toFixed(1)}` : undefined} />
      </div>

      {status === 'rejected' && sheet?.reviewComment && (
        <div className="mb-6">
          <Notice tone="warn">
            <strong>Returned for correction:</strong> {sheet.reviewComment}
          </Notice>
        </div>
      )}
      {status === 'submitted' && (
        <div className="mb-6">
          <Notice>These results are awaiting departmental approval and are locked.</Notice>
        </div>
      )}
      {status === 'approved' && (
        <div className="mb-6">
          <Notice>These results are approved and visible to students. Ask your department admin to reopen them if a correction is needed.</Notice>
        </div>
      )}

      <Section title="Class list and scores" description="CA is out of 30 and the exam out of 70. Totals and grades are calculated automatically.">
        <ScoreSheet offeringId={offering.offeringId} version={data.version} editable={isEditableByLecturer(status)} rows={rows} />
      </Section>
    </>
  );
}
