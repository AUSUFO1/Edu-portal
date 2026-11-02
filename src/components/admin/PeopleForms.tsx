'use client';

import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { LEVELS } from '@/domain/registration';
import {
  changeRoleAction,
  createAdminAction,
  createLecturerAction,
  createStudentAction,
  resetPasswordAction,
  setAccountStatusAction,
} from '@/server/actions/management';

type Option = { id: string; name: string };

function PersonFields() {
  return (
    <>
      <Field name="firstName" label="First name">
        <Input name="firstName" autoComplete="off" maxLength={60} />
      </Field>
      <Field name="lastName" label="Last name">
        <Input name="lastName" autoComplete="off" maxLength={60} />
      </Field>
      <Field name="email" label="Email">
        <Input name="email" type="email" autoComplete="off" />
      </Field>
      <Field name="password" label="Initial password" hint="At least 10 characters with a letter and a number">
        <Input name="password" type="password" autoComplete="new-password" />
      </Field>
    </>
  );
}

export function CreateStudentForm({ programs }: { programs: Option[] }) {
  const year = new Date().getFullYear();
  return (
    <ActionForm action={createStudentAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <PersonFields />
      <Field name="matricNumber" label="Matric number" hint="e.g. UNI/2026/CSC/011">
        <Input name="matricNumber" autoComplete="off" />
      </Field>
      <Field name="programId" label="Program">
        <Select name="programId" defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
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
      <Field name="entryYear" label="Entry year">
        <Input name="entryYear" type="number" defaultValue={year} min={1960} max={year + 1} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton>Create student</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CreateLecturerForm({ departments }: { departments: Option[] }) {
  return (
    <ActionForm action={createLecturerAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field name="title" label="Title">
        <Select name="title" defaultValue="Dr">
          {['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Engr'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <PersonFields />
      <Field name="staffNumber" label="Staff number" hint="e.g. STF/0412">
        <Input name="staffNumber" autoComplete="off" />
      </Field>
      <Field name="rank" label="Rank" hint="e.g. Senior Lecturer">
        <Input name="rank" />
      </Field>
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
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton>Create lecturer</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CreateAdminForm({ departments }: { departments: Option[] }) {
  return (
    <ActionForm action={createAdminAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <PersonFields />
      <Field name="role" label="Role">
        <Select name="role" defaultValue="department_admin">
          <option value="department_admin">Department admin</option>
          <option value="super_admin">Super admin</option>
        </Select>
      </Field>
      <Field name="departmentId" label="Department" hint="Required for department admins">
        <Select name="departmentId" defaultValue="">
          <option value="">None</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton>Create administrator</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function AccountControls({ userId, status, role, canManageAccounts }: { userId: string; status: 'active' | 'suspended' | 'deactivated'; role: string; canManageAccounts: boolean }) {
  return (
    <details className="relative">
      <summary className="btn btn-secondary btn-sm cursor-pointer list-none">Manage</summary>
      <div className="absolute right-0 z-20 mt-2 w-72 space-y-4 rounded-2xl border border-ink/10 bg-paper p-4 text-left shadow-xl">
        {canManageAccounts && (
          <ActionForm action={setAccountStatusAction}>
            <input type="hidden" name="userId" value={userId} />
            <p className="label">Account status</p>
            <div className="flex flex-wrap gap-1.5">
              {(['active', 'suspended', 'deactivated'] as const)
                .filter((s) => s !== status)
                .map((s) => (
                  <SubmitButton key={s} name="status" value={s} size="sm" variant={s === 'active' ? 'primary' : 'danger'}>
                    {s === 'active' ? 'Activate' : s === 'suspended' ? 'Suspend' : 'Deactivate'}
                  </SubmitButton>
                ))}
            </div>
          </ActionForm>
        )}
        {canManageAccounts && role !== 'student' && (
          <ActionForm action={changeRoleAction}>
            <input type="hidden" name="userId" value={userId} />
            <p className="label">Role</p>
            <div className="flex flex-wrap gap-1.5">
              {(['lecturer', 'department_admin', 'super_admin'] as const)
                .filter((r) => r !== role)
                .map((r) => (
                  <SubmitButton key={r} name="role" value={r} size="sm" variant="secondary">
                    {r === 'lecturer' ? 'Lecturer' : r === 'department_admin' ? 'Dept admin' : 'Super admin'}
                  </SubmitButton>
                ))}
            </div>
          </ActionForm>
        )}
        <ActionForm action={resetPasswordAction} resetOnSuccess>
          <input type="hidden" name="userId" value={userId} />
          <Field name="password" label="Set new password">
            <Input name="password" type="password" autoComplete="new-password" />
          </Field>
          <div className="mt-2">
            <SubmitButton size="sm">Reset password</SubmitButton>
          </div>
        </ActionForm>
      </div>
    </details>
  );
}
