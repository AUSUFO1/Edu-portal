import type { Metadata } from 'next';
import { PageHeader, Section } from '@/components/ui/primitives';
import { requirePageRole } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { lecturerProfile } from '@/server/services/user.service';
import { LecturerProfileForm } from './LecturerProfileForm';

export const metadata: Metadata = { title: 'Profile' };

export default async function LecturerProfilePage() {
  const actor = await requirePageRole('lecturer');
  const profile = await lecturerProfile(await getDb(), actor.id);

  const facts: [string, string][] = [
    ['Full name', `${profile.title} ${profile.firstName} ${profile.lastName}`],
    ['Staff number', profile.staffNumber],
    ['Rank', profile.rank],
    ['Email', profile.email],
    ['Department', profile.departmentName],
    ['Faculty', profile.facultyName],
  ];

  return (
    <>
      <PageHeader eyebrow="My account" title="Profile" description="Your staff record is managed by your department. You can update your phone number." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Section title="Staff details">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</dt>
                <dd className="mt-1 break-words font-semibold text-navy">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Contact details">
          <LecturerProfileForm phone={profile.phone ?? ''} />
        </Section>
      </div>
    </>
  );
}
