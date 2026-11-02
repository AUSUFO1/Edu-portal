import type { Metadata } from 'next';
import { ProgramsView } from '@/components/admin/ProgramsView';
import { CreateDepartmentForm, CreateFacultyForm } from '@/components/admin/StructureForms';
import { PageHeader, Section, Table } from '@/components/ui/primitives';
import { serviceContext } from '@/server/auth/session';
import { listDepartments, listFaculties, listPrograms } from '@/server/services/structure.service';

export const metadata: Metadata = { title: 'Faculties & departments' };

export default async function StructurePage() {
  const ctx = await serviceContext('super_admin');
  const [faculties, departments, programs] = await Promise.all([listFaculties(ctx.db), listDepartments(ctx.db), listPrograms(ctx.db)]);

  return (
    <>
      <PageHeader eyebrow="Academic structure" title="Faculties & departments" description="The university's faculties, their departments and the programs each department runs." />
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Section title="Faculties">
            <Table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Faculty</th>
                  <th className="text-right">Departments</th>
                </tr>
              </thead>
              <tbody>
                {faculties.map((f) => (
                  <tr key={f.id}>
                    <td className="font-mono text-xs">{f.code}</td>
                    <td className="font-semibold">{f.name}</td>
                    <td className="text-right">{f.departments}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-5 border-t border-ink/10 pt-5">
              <CreateFacultyForm />
            </div>
          </Section>

          <Section title="Departments">
            <Table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Faculty</th>
                  <th className="text-right">Students</th>
                  <th className="text-right">Lecturers</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono text-xs">{d.code}</td>
                    <td className="font-semibold">{d.name}</td>
                    <td className="text-ink/65">{d.facultyName}</td>
                    <td className="text-right">{d.students}</td>
                    <td className="text-right">{d.lecturers}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="mt-5 border-t border-ink/10 pt-5">
              <CreateDepartmentForm faculties={faculties} />
            </div>
          </Section>
        </div>
        <ProgramsView programs={programs} departments={departments} showDepartment />
      </div>
    </>
  );
}
