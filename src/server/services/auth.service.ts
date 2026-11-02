import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { AppError } from '@/domain/errors';
import { PORTAL_LABEL, PORTAL_ROLES, portalFor, type Portal } from '@/domain/portals';
import type { Role } from '@/domain/roles';
import type { Actor } from '../auth/actor';
import { DUMMY_HASH, verifyPassword } from '../auth/password';
import { newSessionToken, sessionIdFromToken } from '../auth/tokens';
import type { Database, Executor } from '../db/client';
import { authSessions, loginAttempts, users } from '../db/schema';
import { recordAudit } from './audit';

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 30;

const INVALID_CREDENTIALS = 'Incorrect email or password.';

interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Verifies credentials and opens a session. Returns the raw token for the cookie.
 * Failures are deliberately vague so the form never reveals whether an email exists.
 * `portal` restricts which roles may sign in through that login page.
 */
export async function signIn(db: Database, email: string, password: string, meta: RequestMeta, portal?: Portal) {
  await assertNotLockedOut(db, email, meta.ipAddress);

  const [user] = await db
    .select({ id: users.id, role: users.role, status: users.status, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
    .limit(1);

  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    await db.insert(loginAttempts).values({ email, ipAddress: meta.ipAddress, succeeded: false });
    throw new AppError('UNAUTHENTICATED', INVALID_CREDENTIALS);
  }
  if (user.status !== 'active') {
    throw new AppError('FORBIDDEN', `This account is ${user.status}. Please contact the registry.`);
  }
  // Checked only after the password is verified, so it reveals nothing to someone guessing.
  if (portal && !PORTAL_ROLES[portal].includes(user.role)) {
    throw new AppError('FORBIDDEN', `This account cannot sign in here. Please use the ${PORTAL_LABEL[portalFor(user.role)]}.`);
  }

  const token = newSessionToken();
  const sessionId = await sessionIdFromToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.transaction(async (tx) => {
    await tx.insert(authSessions).values({ id: sessionId, userId: user.id, expiresAt, ...meta });
    await tx.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await tx.insert(loginAttempts).values({ email, ipAddress: meta.ipAddress, succeeded: true });
    await recordAudit(tx, { actorId: user.id, action: 'auth.sign_in', entityType: 'user', entityId: user.id, ipAddress: meta.ipAddress });
  });

  return { token, expiresAt, role: user.role as Role };
}

async function assertNotLockedOut(db: Database, email: string, ipAddress: string | null) {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const [byEmail] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(sql`lower(${loginAttempts.email})`, email.toLowerCase()), eq(loginAttempts.succeeded, false), gt(loginAttempts.createdAt, since)));
  let tooMany = (byEmail?.n ?? 0) >= MAX_FAILURES_PER_EMAIL;

  if (!tooMany && ipAddress) {
    const [byIp] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(loginAttempts)
      .where(and(eq(loginAttempts.ipAddress, ipAddress), eq(loginAttempts.succeeded, false), gt(loginAttempts.createdAt, since)));
    tooMany = (byIp?.n ?? 0) >= MAX_FAILURES_PER_IP;
  }
  if (tooMany) {
    throw new AppError('RATE_LIMITED', 'Too many failed attempts. Please wait 15 minutes and try again.');
  }
}

/** Resolves a session token to an active user. Suspended or deactivated users get no actor. */
export async function actorFromToken(db: Database, token: string): Promise<Actor | null> {
  const sessionId = await sessionIdFromToken(token);
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      departmentId: users.departmentId,
      status: users.status,
    })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(and(eq(authSessions.id, sessionId), gt(authSessions.expiresAt, new Date())))
    .limit(1);

  if (!row || row.status !== 'active') return null;
  return { id: row.id, email: row.email, firstName: row.firstName, lastName: row.lastName, role: row.role, departmentId: row.departmentId };
}

export async function signOut(db: Database, token: string, actorId: string | null) {
  const sessionId = await sessionIdFromToken(token);
  await db.delete(authSessions).where(eq(authSessions.id, sessionId));
  if (actorId) await recordAudit(db, { actorId, action: 'auth.sign_out', entityType: 'user', entityId: actorId });
}

/** Ends every session of a user (on suspension, deactivation, role or password change). */
export async function revokeAllSessions(db: Executor, userId: string) {
  await db.delete(authSessions).where(eq(authSessions.userId, userId));
}

/** Housekeeping: expired sessions and old login attempts. Safe to run any time. */
export async function purgeExpired(db: Database) {
  await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
}
