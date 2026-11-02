'use client';

import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { updateProfileAction } from '@/server/actions/student';

export function ProfileForm({ phone, address }: { phone: string; address: string }) {
  return (
    <ActionForm action={updateProfileAction} className="space-y-4">
      <Field name="phone" label="Phone number" hint="e.g. 0803 123 4567">
        <Input name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      </Field>
      <Field name="address" label="Residential address">
        <Input name="address" defaultValue={address} autoComplete="street-address" />
      </Field>
      <SubmitButton>Save changes</SubmitButton>
    </ActionForm>
  );
}
