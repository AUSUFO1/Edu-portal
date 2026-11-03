'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton, useFieldError } from '@/components/ui/form';
import { Badge, EmptyState, Table } from '@/components/ui/primitives';
import { CA_MAX, EXAM_MAX, gradeFor, totalScore } from '@/domain/grading';
import { formatScore } from '@/lib/format';
import { saveScoresAction } from '@/server/actions/results';

interface Row {
  registrationId: string;
  matricNumber: string;
  firstName: string;
  lastName: string;
  level: number;
  caScore: number | null;
  examScore: number | null;
}

export function ScoreSheet({ offeringId, version, editable, rows }: { offeringId: string; version: number; editable: boolean; rows: Row[] }) {
  const [scores, setScores] = useState(() =>
    Object.fromEntries(rows.map((r) => [r.registrationId, { ca: formatScore(r.caScore), exam: formatScore(r.examScore) }])),
  );

  if (rows.length === 0) return <EmptyState title="No students registered" description="Students appear here once they register for this course." />;

  const set = (id: string, field: 'ca' | 'exam', value: string) => setScores((prev) => ({ ...prev, [id]: { ...prev[id]!, [field]: value } }));

  return (
    <ActionForm action={saveScoresAction} confirm={undefined}>
      <input type="hidden" name="offeringId" value={offeringId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <Table>
        <thead>
          <tr>
            <th>Matric number</th>
            <th>Name</th>
            <th className="w-28">CA /{CA_MAX}</th>
            <th className="w-28">Exam /{EXAM_MAX}</th>
            <th className="text-right">Total</th>
            <th className="text-center">Grade</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = scores[r.registrationId]!;
            return (
              <tr key={r.registrationId}>
                <td className="font-semibold whitespace-nowrap">{r.matricNumber}</td>
                <td className="whitespace-nowrap">
                  {r.lastName}, {r.firstName}
                </td>
                <td>
                  <ScoreInput name={`ca:${r.registrationId}`} value={s.ca} max={CA_MAX} disabled={!editable} onChange={(v) => set(r.registrationId, 'ca', v)} label={`CA for ${r.matricNumber}`} />
                </td>
                <td>
                  <ScoreInput name={`exam:${r.registrationId}`} value={s.exam} max={EXAM_MAX} disabled={!editable} onChange={(v) => set(r.registrationId, 'exam', v)} label={`Exam for ${r.matricNumber}`} />
                </td>
                {(() => {
                  const preview = previewFor(s.ca, s.exam);
                  return (
                    <>
                      <td className="text-right font-semibold">{preview ? preview.total : <span className="text-ink/35">—</span>}</td>
                      <td className="text-center">{preview ? <Badge tone={preview.point === 0 ? 'red' : 'green'}>{preview.grade}</Badge> : <span className="text-ink/35">—</span>}</td>
                    </>
                  );
                })()}
              </tr>
            );
          })}
        </tbody>
      </Table>
      {editable && (
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <SubmitButton variant="secondary" name="intent" value="save">
            Save draft
          </SubmitButton>
          <SubmitButton name="intent" value="submit">
            Submit for approval
          </SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}

function ScoreInput({ name, value, max, disabled, onChange, label }: { name: string; value: string; max: number; disabled: boolean; onChange: (v: string) => void; label: string }) {
  const error = useFieldError(name);
  return (
    <div>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        title={error}
        placeholder={`0-${max}`}
        className="input h-9 w-24 text-right"
      />
      {error && <p className="mt-0.5 text-[11px] font-semibold text-danger">{error}</p>}
    </div>
  );
}

/** Live total and grade while typing; the server recalculates both on save. */
function previewFor(ca: string, exam: string) {
  const c = Number(ca);
  const e = Number(exam);
  const valid = ca !== '' && exam !== '' && c >= 0 && c <= CA_MAX && e >= 0 && e <= EXAM_MAX;
  if (!valid) return null;
  const total = totalScore(c, e);
  return { total, ...gradeFor(total) };
}
