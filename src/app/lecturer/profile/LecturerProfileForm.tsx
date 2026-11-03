'use client';

import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { updateLecturerProfileAction } from '@/server/actions/lecturer';

export function LecturerProfileForm({ phone }: { phone: string }) {
  return (
    <ActionForm action={updateLecturerProfileAction} className="space-y-4">
      <Field name="phone" label="Phone number" hint="e.g. 0803 123 4567">
        <Input name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      </Field>
      <SubmitButton>Save changes</SubmitButton>
    </ActionForm>
  );
}
