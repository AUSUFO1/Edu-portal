'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppError } from '@/domain/errors';
import { ROLE_HOME } from '@/domain/roles';
import { signInSchema } from '@/lib/validation';
import { getDb } from '../db/client';
import { clearSessionCookie, clientIp, getActor, readSessionToken, setSessionCookie } from '../auth/session';
import { signIn, signOut } from '../services/auth.service';
import { toFailure, type ActionState } from './safe-action';

export async function signInAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({ email: form.get('email'), password: form.get('password') });
  if (!parsed.success) return { ok: false, message: 'Enter your email and password.' };

  let destination: string;
  try {
    const db = await getDb();
    const session = await signIn(db, parsed.data.email, parsed.data.password, {
      ipAddress: await clientIp(),
      userAgent: (await headers()).get('user-agent')?.slice(0, 300) ?? null,
    });
    await setSessionCookie(session.token, session.expiresAt);
    destination = ROLE_HOME[session.role];
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.message };
    return toFailure(error);
  }
  redirect(destination);
}

export async function signOutAction() {
  const token = await readSessionToken();
  if (token) {
    const actor = await getActor();
    await signOut(await getDb(), token, actor?.id ?? null);
  }
  await clearSessionCookie();
  redirect('/login');
}
