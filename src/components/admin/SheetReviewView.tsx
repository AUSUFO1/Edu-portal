import Link from 'next/link';
import { Badge, Notice, PageHeader, Section, StatCard, Table } from '@/components/ui/primitives';
import { SheetStatusBadge } from '@/components/ui/status';
import { formatDateTime, formatScore, termLabel } from '@/lib/format';
import type { reviewSheet } from '@/server/services/result.service';
import { ReviewActions } from './ReviewActions';

type Review = Awaited<ReturnType<typeof reviewSheet>>;

/** A result sheet with its scores and history. `canDecide` is true only for the course's department admin. */
export function SheetReviewView({ data, backHref, canDecide, actorId }: { data: Review; backHref: string; canDecide: boolean; actorId: string }) {
  const { sheet, offering, rows, submitter, reviewer } = data;
  const scored = rows.filter((r) => r.caScore !== null);
  const passed = scored.filter((r) => (r.gradePoint ?? 0) > 0).length;
  const average = scored.length ? scored.reduce((sum, r) => sum + r.caScore! + r.examScore!, 0) / scored.length : 0;
  const distribution = ['A', 'B', 'C', 'D', 'E', 'F'].map((g) => ({ grade: g, count: scored.filter((r) => r.grade === g).length }));
  const ownSubmission = sheet.submittedBy === actorId;

  return (
    <>
      <PageHeader
        eyebrow={`${offering.departmentName} · ${offering.sessionName} · ${termLabel(offering.term)}`}
        title={`${offering.code} · ${offering.title}`}
        description={`${offering.units} units · ${offering.level} level`}
        actions={
          <Link href={backHref} className="btn btn-secondary">
            Back to list
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <StatCard label="Status" value={<SheetStatusBadge status={sheet.status} />} />
        <StatCard label="Students scored" value={`${scored.length}/${rows.length}`} />
        <StatCard label="Pass rate" value={scored.length ? `${Math.round((passed / scored.length) * 100)}%` : '—'} />
        <StatCard label="Average" value={scored.length ? average.toFixed(1) : '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Section title="Scores">
          <Table>
            <thead>
              <tr>
                <th>Matric number</th>
                <th>Name</th>
                <th className="text-right">CA</th>
                <th className="text-right">Exam</th>
                <th className="text-right">Total</th>
                <th className="text-center">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.registrationId}>
                  <td className="font-semibold">{r.matricNumber}</td>
                  <td>
                    {r.lastName}, {r.firstName}
                  </td>
                  <td className="text-right">{formatScore(r.caScore)}</td>
                  <td className="text-right">{formatScore(r.examScore)}</td>
                  <td className="text-right font-semibold">{r.caScore !== null ? Math.round(r.caScore + r.examScore!) : '—'}</td>
                  <td className="text-center">{r.grade ? <Badge tone={r.gradePoint === 0 ? 'red' : 'green'}>{r.grade}</Badge> : <Badge>Missing</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>

        <div className="space-y-6">
          <Section title="Grade distribution">
            <ul className="space-y-2">
              {distribution.map((d) => (
                <li key={d.grade} className="flex items-center gap-3 text-sm">
                  <span className="w-5 font-bold text-navy">{d.grade}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <span className="block h-full rounded-full bg-green" style={{ width: `${scored.length ? (d.count / scored.length) * 100 : 0}%` }} />
                  </span>
                  <span className="w-6 text-right text-ink/60">{d.count}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="History">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-ink/55">Submitted</dt>
                <dd className="font-semibold">{sheet.submittedAt ? `${formatDateTime(sheet.submittedAt)} by ${submitter}` : 'Not yet'}</dd>
              </div>
              <div>
                <dt className="text-ink/55">Last review</dt>
                <dd className="font-semibold">{sheet.reviewedAt ? `${formatDateTime(sheet.reviewedAt)} by ${reviewer}` : 'Not yet'}</dd>
              </div>
              {sheet.reviewComment && (
                <div>
                  <dt className="text-ink/55">Comment</dt>
                  <dd>{sheet.reviewComment}</dd>
                </div>
              )}
            </dl>
          </Section>

          {canDecide && (sheet.status === 'submitted' || sheet.status === 'approved') && (
            <Section title={sheet.status === 'submitted' ? 'Decision' : 'Reopen results'}>
              {ownSubmission && sheet.status === 'submitted' ? (
                <Notice tone="warn">You submitted these results, so another department admin must review them.</Notice>
              ) : (
                <ReviewActions sheetId={sheet.id} version={sheet.version} status={sheet.status} />
              )}
            </Section>
          )}
          {!canDecide && sheet.status === 'submitted' && <Notice>Only an admin of {offering.departmentName} can approve or reject these results.</Notice>}
        </div>
      </div>
    </>
  );
}
