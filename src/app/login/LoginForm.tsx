'use client';

import { ActionForm, Field, Input, PasswordInput, SubmitButton } from '@/components/ui/form';
import { signInAction } from '@/server/actions/auth';

export function LoginForm() {
  return (
    <ActionForm action={signInAction} className="mt-8 space-y-4">
      <Field name="email" label="Email">
        <Input name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field name="password" label="Password">
        <PasswordInput name="password" autoComplete="current-password" required />
      </Field>
      <div className="pt-2 [&>button]:w-full">
        <SubmitButton>Sign in</SubmitButton>
      </div>
    </ActionForm>
  );
}
