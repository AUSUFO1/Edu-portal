'use client';

import { ActionForm, Field, Input, PasswordInput, SubmitButton } from '@/components/ui/form';
import type { Portal } from '@/domain/portals';
import { signInAction } from '@/server/actions/auth';

export function LoginForm({ portal }: { portal: Portal }) {
  return (
    <ActionForm action={signInAction} className="mt-8 space-y-4">
      <input type="hidden" name="portal" value={portal} />
      <Field name="email" label="Email">
        <Input name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field name="password" label="Password">
        <PasswordInput name="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        {/* Password recovery is out of scope for the MVP; accounts are reset by an administrator. */}
        <button type="button" className="text-xs font-semibold text-green hover:underline">
          Forgot password?
        </button>
      </div>
      <div className="[&>button]:w-full">
        <SubmitButton>Sign in</SubmitButton>
      </div>
    </ActionForm>
  );
}
