import { Badge, EmptyState, Section, Table } from '@/components/ui/primitives';
import type { CurrentSemester } from '@/server/services/academic-calendar';
import type { listCourses } from '@/server/services/structure.service';
import { AllocateForm, CourseRowActions, CreateCourseForm, UnallocateButton } from './CourseForms';

type Course = Awaited<ReturnType<typeof listCourses>>[number];

export function CoursesView({
  courses,
  departments,
  programs,
  lecturersByDepartment,
  semester,
  showDepartment,
}: {
  courses: Course[];
  departments: { id: string; name: string }[];
  programs: { id: string; name: string; departmentId: string }[];
  lecturersByDepartment: Record<string, { id: string; name: string }[]>;
  semester: CurrentSemester | null;
  showDepartment: boolean;
}) {
  return (
    <div className="space-y-6">
      <Section title="Courses" description={semester ? `Offer courses for the ${semester.term} semester of ${semester.sessionName} and assign lecturers.` : 'No active semester: courses cannot be offered yet.'}>
        {courses.length === 0 ? (
          <EmptyState title="No courses yet" description="Create the first course below." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Course</th>
                {showDepartment && <th>Department</th>}
                <th className="text-right">Units</th>
                <th>Level</th>
                <th>Semester</th>
                <th>This semester</th>
                <th>Lecturers</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className={c.isActive ? '' : 'opacity-55'}>
                  <td>
                    <span className="font-semibold">{c.code}</span> <span className="text-ink/65">{c.title}</span>
                  </td>
                  {showDepartment && <td>{c.departmentName}</td>}
                  <td className="text-right">{c.units}</td>
                  <td>{c.level}</td>
                  <td className="capitalize">{c.term}</td>
                  <td>{c.offeringId ? <Badge tone="green">Offered · {c.registered} registered</Badge> : c.isActive ? <Badge>Not offered</Badge> : <Badge tone="red">Inactive</Badge>}</td>
                  <td className="min-w-56">
                    {c.offeringId ? (
                      <div className="space-y-1.5">
                        {c.lecturers.map((l) => (
                          <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                            <span>{l.name}</span>
                            <UnallocateButton offeringId={c.offeringId!} lecturerId={l.id} name={l.name} />
                          </div>
                        ))}
                        <AllocateForm offeringId={c.offeringId} lecturers={(lecturersByDepartment[c.departmentId] ?? []).filter((l) => !c.lecturers.some((a) => a.id === l.id))} />
                      </div>
                    ) : (
                      <span className="text-ink/40">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <CourseRowActions courseId={c.id} isActive={c.isActive} canOffer={Boolean(semester) && !c.offeringId && c.isActive && semester?.term === c.term} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Create a course">
        <CreateCourseForm departments={departments} programs={programs} />
      </Section>
    </div>
  );
}
