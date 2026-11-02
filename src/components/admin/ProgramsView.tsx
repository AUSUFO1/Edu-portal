import { EmptyState, Section, Table } from '@/components/ui/primitives';
import type { listPrograms } from '@/server/services/structure.service';
import { CreateProgramForm } from './StructureForms';

type Program = Awaited<ReturnType<typeof listPrograms>>[number];

export function ProgramsView({ programs, departments, showDepartment }: { programs: Program[]; departments: { id: string; name: string }[]; showDepartment: boolean }) {
  return (
    <div className="space-y-6">
      <Section title="Programs">
        {programs.length === 0 ? (
          <EmptyState title="No programs yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Program</th>
                {showDepartment && <th>Department</th>}
                <th className="text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.code}</td>
                  <td className="font-semibold">
                    {p.award} {p.name}
                  </td>
                  {showDepartment && <td>{p.departmentName}</td>}
                  <td className="text-right">{p.durationYears} years</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
      <Section title="Create a program">
        <CreateProgramForm departments={departments} />
      </Section>
    </div>
  );
}
