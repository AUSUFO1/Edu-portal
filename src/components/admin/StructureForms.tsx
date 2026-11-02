'use client';

import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import {
  createDepartmentAction,
  createFacultyAction,
  createProgramAction,
  createSessionAction,
  setCurrentSemesterAction,
  setRegistrationOpenAction,
} from '@/server/actions/management';

type Option = { id: string; name: string };

export function CreateFacultyForm() {
  return (
    <ActionForm action={createFacultyAction} resetOnSuccess className="grid gap-4 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
      <Field name="code" label="Code">
        <Input name="code" placeholder="SCI" maxLength={10} />
      </Field>
      <Field name="name" label="Name">
        <Input name="name" placeholder="Faculty of Science" maxLength={120} />
      </Field>
      <SubmitButton>Create faculty</SubmitButton>
    </ActionForm>
  );
}

export function CreateDepartmentForm({ faculties }: { faculties: Option[] }) {
  return (
    <ActionForm action={createDepartmentAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_1fr_auto] lg:items-end">
      <Field name="facultyId" label="Faculty">
        <Select name="facultyId" defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field name="code" label="Code">
        <Input name="code" placeholder="CSC" maxLength={10} />
      </Field>
      <Field name="name" label="Name">
        <Input name="name" placeholder="Computer Science" maxLength={120} />
      </Field>
      <SubmitButton>Create department</SubmitButton>
    </ActionForm>
  );
}

export function CreateProgramForm({ departments }: { departments: Option[] }) {
  return (
    <ActionForm action={createProgramAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      {departments.length === 1 ? (
        <input type="hidden" name="departmentId" value={departments[0]!.id} />
      ) : (
        <Field name="departmentId" label="Department">
          <Select name="departmentId" defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field name="code" label="Code">
        <Input name="code" placeholder="BSC-CSC" maxLength={15} />
      </Field>
      <Field name="name" label="Name">
        <Input name="name" placeholder="Computer Science" maxLength={120} />
      </Field>
      <Field name="award" label="Award">
        <Select name="award" defaultValue="B.Sc.">
          {['B.Sc.', 'B.A.', 'B.Eng.', 'B.Tech.', 'LL.B.', 'MBBS', 'M.Sc.', 'Ph.D.'].map((a) => (
            <option key={a}>{a}</option>
          ))}
        </Select>
      </Field>
      <Field name="durationYears" label="Duration (years)">
        <Select name="durationYears" defaultValue="4">
          {[1, 2, 3, 4, 5, 6, 7].map((y) => (
            <option key={y}>{y}</option>
          ))}
        </Select>
      </Field>
      <div className="lg:col-span-5">
        <SubmitButton>Create program</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CreateSessionForm() {
  const year = new Date().getFullYear();
  return (
    <ActionForm action={createSessionAction} resetOnSuccess className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <Field name="name" label="Session" hint="Both semesters are created">
        <Input name="name" placeholder={`${year}/${year + 1}`} />
      </Field>
      <Field name="startsOn" label="Starts">
        <Input name="startsOn" type="date" />
      </Field>
      <Field name="endsOn" label="Ends">
        <Input name="endsOn" type="date" />
      </Field>
      <SubmitButton>Create session</SubmitButton>
    </ActionForm>
  );
}

export function SemesterControls({ semesterId, isCurrent, registrationOpen }: { semesterId: string; isCurrent: boolean; registrationOpen: boolean }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {!isCurrent && (
        <ActionForm action={setCurrentSemesterAction} confirm="Make this the current semester? Registration for the previous semester will close.">
          <input type="hidden" name="semesterId" value={semesterId} />
          <SubmitButton size="sm" variant="secondary">
            Make current
          </SubmitButton>
        </ActionForm>
      )}
      {isCurrent && (
        <ActionForm action={setRegistrationOpenAction}>
          <input type="hidden" name="semesterId" value={semesterId} />
          <input type="hidden" name="open" value={String(!registrationOpen)} />
          <SubmitButton size="sm" variant={registrationOpen ? 'danger' : 'primary'}>
            {registrationOpen ? 'Close registration' : 'Open registration'}
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
