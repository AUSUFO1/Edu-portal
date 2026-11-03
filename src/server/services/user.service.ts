/** Student, lecturer and admin accounts. */
import { and, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { conflict, forbidden, invalid, notFound } from '@/domain/errors';
import type { Role } from '@/domain/roles';
import { hashPassword } from '../auth/password';
import { assertCanManageDepartment, assertRole } from '../auth/policy';
import type { Executor } from '../db/client';
import { departments, faculties, lecturers, programs, students, users } from '../db/schema';
import { recordAudit } from './audit';
import { revokeAllSessions } from './auth.service';
import type { ServiceContext } from './context';

interface PersonInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

const audit = (ctx: ServiceContext, executor: Executor, action: string, entityId: string, details?: Record<string, unknown>) =>
  recordAudit(executor, { actorId: ctx.actor.id, action, entityType: 'user', entityId, details, ipAddress: ctx.ipAddress });

// ---------------------------------------------------------------- create

export async function createStudent(ctx: ServiceContext, input: PersonInput & { matricNumber: string; programId: string; level: number; entryYear: number }) {
  assertRole(ctx.actor, 'super_admin', 'department_admin');
  const [program] = await ctx.db.select({ departmentId: programs.departmentId }).from(programs).where(eq(programs.id, input.programId));
  if (!program) throw notFound('Program');
  assertCanManageDepartment(ctx.actor, program.departmentId);

  const passwordHash = await hashPassword(input.password);
  return ctx.db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: input.email, passwordHash, firstName: input.firstName, lastName: input.lastName, role: 'student', departmentId: program.departmentId })
      .returning({ id: users.id });
    await tx.insert(students).values({
      userId: user!.id,
      matricNumber: input.matricNumber.toUpperCase(),
      programId: input.programId,
      level: input.level,
      entryYear: input.entryYear,
    });
    await audit(ctx, tx, 'user.create_student', user!.id, { matricNumber: input.matricNumber, programId: input.programId, level: input.level });
    return user!;
  });
}

export async function createLecturer(ctx: ServiceContext, input: PersonInput & { departmentId: string; staffNumber: string; title: string; rank: string }) {
  assertRole(ctx.actor, 'super_admin', 'department_admin');
  assertCanManageDepartment(ctx.actor, input.departmentId);
  const passwordHash = await hashPassword(input.password);
  return ctx.db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: input.email, passwordHash, firstName: input.firstName, lastName: input.lastName, role: 'lecturer', departmentId: input.departmentId })
      .returning({ id: users.id });
    await tx.insert(lecturers).values({ userId: user!.id, staffNumber: input.staffNumber.toUpperCase(), title: input.title, rank: input.rank });
    await audit(ctx, tx, 'user.create_lecturer', user!.id, { staffNumber: input.staffNumber, departmentId: input.departmentId });
    return user!;
  });
}

export async function createAdmin(ctx: ServiceContext, input: PersonInput & { role: 'department_admin' | 'super_admin'; departmentId: string | null }) {
  assertRole(ctx.actor, 'super_admin');
  if (input.role === 'department_admin' && !input.departmentId) throw invalid('A department admin needs a department.', { departmentId: 'Required' });
  const passwordHash = await hashPassword(input.password);
  return ctx.db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        departmentId: input.role === 'super_admin' ? null : input.departmentId,
      })
      .returning({ id: users.id });
    await audit(ctx, tx, 'user.create_admin', user!.id, { role: input.role, departmentId: input.departmentId });
    return user!;
  });
}

// ---------------------------------------------------------------- read

export async function listUsers(db: Executor, filter: { departmentId?: string | null; role?: Role; search?: string }) {
  const conditions: (SQL | undefined)[] = [
    filter.departmentId ? eq(users.departmentId, filter.departmentId) : undefined,
    filter.role ? eq(users.role, filter.role) : undefined,
  ];
  if (filter.search) {
    const term = `%${filter.search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(or(ilike(users.firstName, term), ilike(users.lastName, term), ilike(users.email, term), ilike(students.matricNumber, term), ilike(lecturers.staffNumber, term)));
  }
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      status: users.status,
      departmentId: users.departmentId,
      departmentName: departments.name,
      matricNumber: students.matricNumber,
      level: students.level,
      programName: programs.name,
      staffNumber: lecturers.staffNumber,
      title: lecturers.title,
      rank: lecturers.rank,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(programs, eq(programs.id, students.programId))
    .leftJoin(lecturers, eq(lecturers.userId, users.id))
    .where(and(...conditions))
    .orderBy(asc(users.lastName), asc(users.firstName))
    .limit(500);
}

export async function studentProfile(db: Executor, userId: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      matricNumber: students.matricNumber,
      level: students.level,
      entryYear: students.entryYear,
      phone: students.phone,
      address: students.address,
      programName: programs.name,
      award: programs.award,
      departmentName: departments.name,
      facultyName: faculties.name,
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(programs, eq(programs.id, students.programId))
    .innerJoin(departments, eq(departments.id, programs.departmentId))
    .innerJoin(faculties, eq(faculties.id, departments.facultyId))
    .where(eq(students.userId, userId));
  if (!row) throw notFound('Student');
  return row;
}

export async function departmentLecturers(db: Executor, departmentId: string) {
  return db
    .select({ id: users.id, name: sql<string>`${lecturers.title} || ' ' || ${users.firstName} || ' ' || ${users.lastName}` })
    .from(lecturers)
    .innerJoin(users, eq(users.id, lecturers.userId))
    .where(and(eq(users.departmentId, departmentId), eq(users.status, 'active')))
    .orderBy(asc(users.lastName));
}

/** A lecturer's own profile, with the number of courses assigned this semester. */
export async function lecturerProfile(db: Executor, userId: string) {
  const [row] = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      title: lecturers.title,
      rank: lecturers.rank,
      staffNumber: lecturers.staffNumber,
      phone: lecturers.phone,
      departmentName: departments.name,
      facultyName: faculties.name,
    })
    .from(lecturers)
    .innerJoin(users, eq(users.id, lecturers.userId))
    .innerJoin(departments, eq(departments.id, users.departmentId))
    .innerJoin(faculties, eq(faculties.id, departments.facultyId))
    .where(eq(lecturers.userId, userId));
  if (!row) throw notFound('Lecturer');
  return row;
}

// ---------------------------------------------------------------- update

/** Lecturers may change only their phone number; the rest is managed by their department. */
export async function updateOwnLecturerProfile(ctx: ServiceContext, input: { phone: string | null }) {
  assertRole(ctx.actor, 'lecturer');
  await ctx.db.transaction(async (tx) => {
    await tx.update(lecturers).set({ phone: input.phone }).where(eq(lecturers.userId, ctx.actor.id));
    await audit(ctx, tx, 'user.update_profile', ctx.actor.id, { fields: ['phone'] });
  });
}

/** Students may change only their contact details; academic fields are admin-managed. */
export async function updateOwnStudentProfile(ctx: ServiceContext, input: { phone: string | null; address: string | null }) {
  assertRole(ctx.actor, 'student');
  await ctx.db.transaction(async (tx) => {
    await tx.update(students).set(input).where(eq(students.userId, ctx.actor.id));
    await audit(ctx, tx, 'user.update_profile', ctx.actor.id, { fields: Object.keys(input) });
  });
}

async function targetUser(db: Executor, userId: string) {
  const [user] = await db.select({ id: users.id, role: users.role, status: users.status, departmentId: users.departmentId, email: users.email }).from(users).where(eq(users.id, userId));
  if (!user) throw notFound('User');
  return user;
}

export async function setAccountStatus(ctx: ServiceContext, userId: string, status: 'active' | 'suspended' | 'deactivated') {
  assertRole(ctx.actor, 'super_admin');
  if (userId === ctx.actor.id) throw forbidden('You cannot change the status of your own account.');
  const user = await targetUser(ctx.db, userId);
  await ctx.db.transaction(async (tx) => {
    await tx.update(users).set({ status }).where(eq(users.id, userId));
    if (status !== 'active') await revokeAllSessions(tx, userId);
    await audit(ctx, tx, 'user.set_status', userId, { from: user.status, to: status });
  });
}

/**
 * Role changes between staff roles. A lecturer keeps their lecturer profile, so a department
 * admin can also teach. Students are not converted to staff (different record, different rules).
 */
export async function changeRole(ctx: ServiceContext, userId: string, role: 'lecturer' | 'department_admin' | 'super_admin') {
  assertRole(ctx.actor, 'super_admin');
  if (userId === ctx.actor.id) throw forbidden('You cannot change your own role.');
  const user = await targetUser(ctx.db, userId);
  if (user.role === 'student') throw conflict('Student accounts cannot be changed to staff roles.');
  if (user.role === role) return;
  await ctx.db.transaction(async (tx) => {
    if (role === 'lecturer') {
      const [profile] = await tx.select({ id: lecturers.userId }).from(lecturers).where(eq(lecturers.userId, userId));
      if (!profile) throw conflict('This user has no lecturer profile. Create them as a lecturer instead.');
    }
    if (role !== 'super_admin' && !user.departmentId) throw conflict('Assign the user to a department first.');
    await tx.update(users).set({ role }).where(eq(users.id, userId));
    await revokeAllSessions(tx, userId);
    await audit(ctx, tx, 'user.change_role', userId, { from: user.role, to: role });
  });
}

export async function resetPassword(ctx: ServiceContext, userId: string, newPassword: string) {
  assertRole(ctx.actor, 'super_admin', 'department_admin');
  const user = await targetUser(ctx.db, userId);
  if (ctx.actor.role === 'department_admin') {
    if (!user.departmentId || user.role === 'department_admin' || user.role === 'super_admin') throw forbidden();
    assertCanManageDepartment(ctx.actor, user.departmentId);
  }
  const passwordHash = await hashPassword(newPassword);
  await ctx.db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, userId));
    await revokeAllSessions(tx, userId);
    await audit(ctx, tx, 'user.reset_password', userId);
  });
}
