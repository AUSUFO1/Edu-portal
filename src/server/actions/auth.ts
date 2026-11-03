'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppError } from '@/domain/errors';
import { isPortal, portalFor } from '@/domain/portals';
import { ROLE_HOME } from '@/domain/roles';
import { signInSchema } from '@/lib/validation';
import { getDb } from '../db/client';
import { clearSessionCookie, clientIp, getActor, readSessionToken, setSessionCookie } from '../auth/session';
import { signIn, signOut } from '../services/auth.service';
import { toFailure, type ActionState } from './safe-action';

export async function signInAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({ email: form.get('email'), password: form.get('password') });
  if (!parsed.success) return { ok: false, message: 'Enter your email and password.' };
  const portal = String(form.get('portal') ?? '');
  if (!isPortal(portal)) return { ok: false, message: 'Unknown portal.' };

  try {
    const db = await getDb();
    const session = await signIn(
      db,
      parsed.data.email,
      parsed.data.password,
      { ipAddress: await clientIp(), userAgent: (await headers()).get('user-agent')?.slice(0, 300) ?? null },
      portal,
    );
    await setSessionCookie(session.token, session.expiresAt);
    // The browser navigates to the dashboard as a separate request, so sign-in itself stays small
    // and fast (on Workers each request has its own CPU budget).
    return { ok: true, message: 'Signed in. Opening your dashboard…', redirectTo: ROLE_HOME[session.role] };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.message };
    return toFailure(error);
  }
}

export async function signOutAction() {
  const token = await readSessionToken();
  const actor = await getActor();
  if (token) await signOut(await getDb(), token, actor?.id ?? null);
  await clearSessionCookie();
  redirect(`/login/${actor ? portalFor(actor.role) : 'student'}`);
}
