import type { Metadata } from 'next';
import { CreateSessionForm, SemesterControls } from '@/components/admin/StructureForms';
import { Badge, PageHeader, Section } from '@/components/ui/primitives';
import { formatDate, termLabel } from '@/lib/format';
import { serviceContext } from '@/server/auth/session';
import { listSessions } from '@/server/services/structure.service';

export const metadata: Metadata = { title: 'Sessions & semesters' };

export default async function SessionsPage() {
  const ctx = await serviceContext('super_admin');
  const sessions = await listSessions(ctx.db);

  return (
    <>
      <PageHeader
        eyebrow="Academic calendar"
        title="Sessions & semesters"
        description="Exactly one semester is current at a time. Course registration can be opened and closed for the current semester only."
      />
      <div className="space-y-6">
        <Section title="Create a session">
          <CreateSessionForm />
        </Section>
        {sessions.map((s) => (
          <Section key={s.id} title={`${s.name} session`} description={`${formatDate(s.startsOn)} – ${formatDate(s.endsOn)}`}>
            <ul className="divide-y divide-ink/10">
              {s.semesters.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy">{termLabel(m.term)}</span>
                    {m.isCurrent && <Badge tone="navy">Current</Badge>}
                    {m.isCurrent && <Badge tone={m.registrationOpen ? 'green' : 'neutral'}>Registration {m.registrationOpen ? 'open' : 'closed'}</Badge>}
                  </div>
                  <SemesterControls semesterId={m.id} isCurrent={m.isCurrent} registrationOpen={m.registrationOpen} />
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
    </>
  );
}
