'use client';

import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Icon } from './icon';
import type { ActionState } from '@/server/actions/safe-action';

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>(null);

/**
 * A form bound to a server action with `useActionState`: shows the outcome message, passes
 * field errors down to <Field>, and optionally resets itself after success.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <FormStateContext.Provider value={state}>
      <form
        ref={ref}
        action={formAction}
        className={className}
        noValidate
        onSubmit={(e) => {
          if (confirm && !window.confirm(confirm)) e.preventDefault();
        }}
      >
        {children}
        <FormMessage />
      </form>
    </FormStateContext.Provider>
  );
}

function FormMessage() {
  const state = useContext(FormStateContext);
  if (!state) return null;
  return (
    <p
      role={state.ok ? 'status' : 'alert'}
      className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${state.ok ? 'bg-green/10 text-navy' : 'bg-danger/10 text-danger'}`}
    >
      {state.message}
    </p>
  );
}

export function useFieldError(name: string) {
  const state = useContext(FormStateContext);
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}

export function Field({
  name,
  label,
  hint,
  className,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
}) {
  const error = useFieldError(name);
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink/50">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  const error = useFieldError(name);
  return <input id={name} name={name} className="input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${name}-error` : undefined} {...props} />;
}

/** Password field with a show/hide toggle. */
export function PasswordInput({ name, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { name: string }) {
  const [visible, setVisible] = useState(false);
  const error = useFieldError(name);
  return (
    <div className="relative">
      <input
        id={name}
        name={name}
        type={visible ? 'text' : 'password'}
        className="input pr-11"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-ink/45 hover:text-navy"
      >
        <Icon icon={visible ? ViewOffSlashIcon : ViewIcon} size={18} />
      </button>
    </div>
  );
}

export function Select({ name, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string }) {
  const error = useFieldError(name);
  return (
    <select id={name} name={name} className="input" aria-invalid={error ? true : undefined} {...props}>
      {children}
    </select>
  );
}

export function SubmitButton({ children, variant = 'primary', name, value, size }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'danger'; name?: string; value?: string; size?: 'sm' }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''}`}>
      {pending ? 'Working…' : children}
    </button>
  );
}
