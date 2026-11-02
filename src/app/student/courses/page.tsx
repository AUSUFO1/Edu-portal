import type { Metadata } from 'next';
import { EmptyState, Notice, PageHeader, Section } from '@/components/ui/primitives';
import { MAX_UNITS_PER_SEMESTER, MIN_UNITS_PER_SEMESTER } from '@/domain/registration';
import { termLabel } from '@/lib/format';
import { serviceContext } from '@/server/auth/session';
import { getRegistrationOverview } from '@/server/services/registration.service';
import { RegistrationForm } from './RegistrationForm';

export const metadata: Metadata = { title: 'Course registration' };

export default async function CourseRegistrationPage() {
  const { semester, courses, registeredUnits } = await getRegistrationOverview(await serviceContext('student'));

  return (
    <>
      <PageHeader
        eyebrow="Course registration"
        title={semester ? `${semester.sessionName} · ${termLabel(semester.term)}` : 'Course registration'}
        description={`Register between ${MIN_UNITS_PER_SEMESTER} and ${MAX_UNITS_PER_SEMESTER} units. Only courses for your program, level and this semester are listed, plus carry-overs you need to retake.`}
      />
      {!semester ? (
        <EmptyState title="No active semester" description="The registry has not opened a semester yet." />
      ) : (
        <div className="space-y-4">
          {!semester.registrationOpen && <Notice tone="warn">Registration is closed for this semester. You can view your courses but not change them.</Notice>}
          {semester.registrationOpen && registeredUnits > 0 && registeredUnits < MIN_UNITS_PER_SEMESTER && (
            <Notice tone="warn">
              You have {registeredUnits} units. The minimum load is {MIN_UNITS_PER_SEMESTER} units.
            </Notice>
          )}
          <Section>
            {courses.length === 0 ? (
              <EmptyState title="No courses available" description="No courses have been offered for your program and level this semester yet. Check back later or contact your department." />
            ) : (
              <RegistrationForm courses={courses} registeredUnits={registeredUnits} open={semester.registrationOpen} maxUnits={MAX_UNITS_PER_SEMESTER} />
            )}
          </Section>
        </div>
      )}
    </>
  );
}
