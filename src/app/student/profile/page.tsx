import type { Metadata } from 'next';
import { PageHeader, Section } from '@/components/ui/primitives';
import { requirePageRole } from '@/server/auth/session';
import { getDb } from '@/server/db/client';
import { studentProfile } from '@/server/services/user.service';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = { title: 'Profile' };

export default async function StudentProfilePage() {
  const actor = await requirePageRole('student');
  const profile = await studentProfile(await getDb(), actor.id);

  const facts: [string, string | number][] = [
    ['Full name', `${profile.firstName} ${profile.lastName}`],
    ['Matriculation number', profile.matricNumber],
    ['Email', profile.email],
    ['Faculty', profile.facultyName],
    ['Department', profile.departmentName],
    ['Program', `${profile.award} ${profile.programName}`],
    ['Level', profile.level],
    ['Entry year', profile.entryYear],
  ];

  return (
    <>
      <PageHeader eyebrow="My account" title="Profile" description="Academic details are managed by your department. You can update your contact details." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Section title="Academic details">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</dt>
                <dd className="mt-1 font-semibold text-navy">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Contact details">
          <ProfileForm phone={profile.phone ?? ''} address={profile.address ?? ''} />
        </Section>
      </div>
    </>
  );
}
