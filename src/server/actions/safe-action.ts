import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import type { z } from 'zod';
import { AppError } from '@/domain/errors';

export type ActionState = { ok: true; message: string } | { ok: false; message: string; fieldErrors?: Record<string, string> } | null;

/**
 * Wraps a server action used with `useActionState`:
 *   1. turns FormData into a plain object (repeated keys become arrays),
 *   2. validates it with the schema,
 *   3. runs the handler and maps failures to a safe, user-facing message.
 *
 * Expected failures (AppError, validation, unique violations) are shown to the user;
 * anything else is logged on the server and replaced by a generic message.
 */
export function formAction<S extends z.ZodType>(
  schema: S,
  handler: (input: z.output<S>) => Promise<string | void>,
  parse: (form: FormData) => unknown = formToObject,
) {
  return async (_previous: ActionState, form: FormData): Promise<ActionState> => {
    const parsed = schema.safeParse(parse(form));
    if (!parsed.success) {
      return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors: flattenIssues(parsed.error.issues) };
    }
    try {
      const message = await handler(parsed.data);
      return { ok: true, message: message ?? 'Saved.' };
    } catch (error) {
      unstable_rethrow(error); // let redirect() and notFound() through
      return toFailure(error);
    }
  };
}

export function toFailure(error: unknown): ActionState {
  if (error instanceof AppError) return { ok: false, message: error.message, fieldErrors: error.fieldErrors };
  if (isUniqueViolation(error)) return { ok: false, message: 'A record with these details already exists.' };
  if (isForeignKeyViolation(error)) return { ok: false, message: 'This record is still in use and cannot be changed that way.' };
  console.error('[action] unexpected error', error);
  return { ok: false, message: 'Something went wrong. Please try again.' };
}

export function formToObject(form: FormData) {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith('$ACTION')) continue;
    const values = form.getAll(key).filter((v): v is string => typeof v === 'string');
    out[key.endsWith('[]') ? key.slice(0, -2) : key] = key.endsWith('[]') ? values : values[0];
  }
  return out;
}

function flattenIssues(issues: z.core.$ZodIssue[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || 'form';
    errors[key] ??= issue.message;
  }
  return errors;
}

function pgCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 3 && current && typeof current === 'object'; i++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^\d{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

const isUniqueViolation = (error: unknown) => pgCode(error) === '23505';
const isForeignKeyViolation = (error: unknown) => pgCode(error) === '23503';
