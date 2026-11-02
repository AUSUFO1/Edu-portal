'use client';

import { useState } from 'react';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { LEVELS } from '@/domain/registration';
import { allocateLecturerAction, createCourseAction, offerCourseAction, setCourseActiveAction, unallocateLecturerAction } from '@/server/actions/management';

export function CreateCourseForm({ departments, programs }: { departments: { id: string; name: string }[]; programs: { id: string; name: string; departmentId: string }[] }) {
  const [departmentId, setDepartmentId] = useState(departments.length === 1 ? departments[0]!.id : '');
  const deptPrograms = programs.filter((p) => p.departmentId === departmentId);

  return (
    <ActionForm action={createCourseAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {departments.length === 1 ? (
        <input type="hidden" name="departmentId" value={departmentId} />
      ) : (
        <Field name="departmentId" label="Department">
          <Select name="departmentId" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Choose…</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field name="code" label="Course code" hint="e.g. CSC 201">
        <Input name="code" maxLength={8} />
      </Field>
      <Field name="title" label="Title" className="sm:col-span-2 lg:col-span-1">
        <Input name="title" maxLength={120} />
      </Field>
      <Field name="units" label="Units">
        <Select name="units" defaultValue="3">
          {[1, 2, 3, 4, 5, 6].map((u) => (
            <option key={u}>{u}</option>
          ))}
        </Select>
      </Field>
      <Field name="level" label="Level">
        <Select name="level" defaultValue="100">
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </Select>
      </Field>
      <Field name="term" label="Semester">
        <Select name="term" defaultValue="first">
          <option value="first">First</option>
          <option value="second">Second</option>
        </Select>
      </Field>
      <fieldset className="sm:col-span-2 lg:col-span-3">
        <legend className="label">Programs that take this course</legend>
        {deptPrograms.length === 0 ? (
          <p className="text-sm text-ink/50">{departmentId ? 'This department has no programs yet.' : 'Choose a department first.'}</p>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {deptPrograms.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="programIds[]" value={p.id} defaultChecked className="size-4 accent-[#1d8f5d]" />
                {p.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <div className="sm:col-span-2 lg:col-span-3">
        <SubmitButton>Create course</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CourseRowActions({ courseId, isActive, canOffer }: { courseId: string; isActive: boolean; canOffer: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      {canOffer && (
        <ActionForm action={offerCourseAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <SubmitButton size="sm">Offer</SubmitButton>
        </ActionForm>
      )}
      <ActionForm action={setCourseActiveAction} confirm={isActive ? 'Deactivate this course? It will no longer be offered.' : undefined}>
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="active" value={String(!isActive)} />
        <SubmitButton size="sm" variant={isActive ? 'secondary' : 'primary'}>
          {isActive ? 'Deactivate' : 'Activate'}
        </SubmitButton>
      </ActionForm>
    </div>
  );
}

export function AllocateForm({ offeringId, lecturers }: { offeringId: string; lecturers: { id: string; name: string }[] }) {
  if (lecturers.length === 0) return null;
  return (
    <ActionForm action={allocateLecturerAction} className="flex gap-1.5">
      <input type="hidden" name="offeringId" value={offeringId} />
      <select name="lecturerId" className="input h-8 text-xs" aria-label="Lecturer to assign" defaultValue="">
        <option value="" disabled>
          Assign lecturer…
        </option>
        {lecturers.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <SubmitButton size="sm" variant="secondary">
        Assign
      </SubmitButton>
    </ActionForm>
  );
}

export function UnallocateButton({ offeringId, lecturerId, name }: { offeringId: string; lecturerId: string; name: string }) {
  return (
    <ActionForm action={unallocateLecturerAction} confirm={`Remove ${name} from this course?`}>
      <input type="hidden" name="offeringId" value={offeringId} />
      <input type="hidden" name="lecturerId" value={lecturerId} />
      <button type="submit" className="text-xs font-bold text-danger hover:underline">
        Remove
      </button>
    </ActionForm>
  );
}
