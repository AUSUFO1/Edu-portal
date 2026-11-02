import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { forbidden } from '@/domain/errors';
import { ROLE_HOME, type Role } from '@/domain/roles';
import { getDb } from '../db/client';
import { actorFromToken } from '../services/auth.service';
import type { ServiceContext } from '../services/context';
import type { Actor } from './actor';

const secure = process.env.NODE_ENV === 'production';
/** `__Host-` binds the cookie to this exact origin over HTTPS (no Domain, Path=/). */
export const SESSION_COOKIE = secure ? '__Host-uemp_session' : 'uemp_session';

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** The signed-in user for this request, resolved once per request. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  return actorFromToken(await getDb(), token);
});

export async function clientIp() {
  const h = await headers();
  return h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

/** For pages and layouts: sends signed-out users to login and other roles to their own home. */
export async function requirePageRole(...roles: Role[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect('/login');
  if (!roles.includes(actor.role)) redirect(ROLE_HOME[actor.role]);
  return actor;
}

/** For server actions: the same check, but failures are errors rather than redirects. */
export async function serviceContext(...roles: Role[]): Promise<ServiceContext> {
  const actor = await getActor();
  if (!actor) redirect('/login');
  if (roles.length && !roles.includes(actor.role)) throw forbidden();
  return { db: await getDb(), actor, ipAddress: await clientIp() };
}
