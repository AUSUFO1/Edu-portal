/**
 * Faculties, departments, programs, academic sessions/semesters, courses, offerings and
 * lecturer allocations.
 */
import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { conflict, forbidden, invalid, notFound } from '@/domain/errors';
import { assertCanManageDepartment, assertRole } from '../auth/policy';
import type { Executor } from '../db/client';
import {
  academicSessions,
  courseAllocations,
  courseOfferings,
  courses,
  departments,
  faculties,
  lecturers,
  programCourses,
  programs,
  registrations,
  semesters,
  users,
} from '../db/schema';
import { findCurrentSemester, requireCurrentSemester } from './academic-calendar';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

const audit = (ctx: ServiceContext, action: string, entityType: string, entityId: string, details?: Record<string, unknown>, executor: Executor = ctx.db) =>
  recordAudit(executor, { actorId: ctx.actor.id, action, entityType, entityId, details, ipAddress: ctx.ipAddress });

// ---------------------------------------------------------------- faculties & departments

export async function listFaculties(db: Executor) {
  return db
    .select({
      id: faculties.id,
      code: faculties.code,
      name: faculties.name,
      departments: sql<number>`(select count(*)::int from ${departments} d where d.faculty_id = ${faculties.id})`,
    })
    .from(faculties)
    .orderBy(asc(faculties.name));
}

export async function createFaculty(ctx: ServiceContext, input: { code: string; name: string }) {
  assertRole(ctx.actor, 'super_admin');
  return ctx.db.transaction(async (tx) => {
    const [row] = await tx.insert(faculties).values(input).returning({ id: faculties.id });
    await audit(ctx, 'faculty.create', 'faculty', row!.id, input, tx);
    return row!;
  });
}

export async function listDepartments(db: Executor) {
  return db
    .select({
      id: departments.id,
      code: departments.code,
      name: departments.name,
      facultyId: faculties.id,
      facultyName: faculties.name,
      students: sql<number>`(select count(*)::int from ${users} u where u.department_id = ${departments.id} and u.role = 'student')`,
      lecturers: sql<number>`(select count(*)::int from ${users} u where u.department_id = ${departments.id} and u.role = 'lecturer')`,
    })
    .from(departments)
    .innerJoin(faculties, eq(faculties.id, departments.facultyId))
    .orderBy(asc(faculties.name), asc(departments.name));
}

export async function createDepartment(ctx: ServiceContext, input: { facultyId: string; code: string; name: string }) {
  assertRole(ctx.actor, 'super_admin');
  return ctx.db.transaction(async (tx) => {
    const [row] = await tx.insert(departments).values(input).returning({ id: departments.id });
    await audit(ctx, 'department.create', 'department', row!.id, input, tx);
    return row!;
  });
}

export async function getDepartment(db: Executor, departmentId: string) {
  const [row] = await db
    .select({ id: departments.id, code: departments.code, name: departments.name, facultyName: faculties.name })
    .from(departments)
    .innerJoin(faculties, eq(faculties.id, departments.facultyId))
    .where(eq(departments.id, departmentId));
  if (!row) throw notFound('Department');
  return row;
}

// ---------------------------------------------------------------- programs

export async function listPrograms(db: Executor, departmentId?: string | null) {
  return db
    .select({
      id: programs.id,
      code: programs.code,
      name: programs.name,
      award: programs.award,
      durationYears: programs.durationYears,
      departmentId: programs.departmentId,
      departmentName: departments.name,
    })
    .from(programs)
    .innerJoin(departments, eq(departments.id, programs.departmentId))
    .where(departmentId ? eq(programs.departmentId, departmentId) : undefined)
    .orderBy(asc(departments.name), asc(programs.name));
}

export async function createProgram(ctx: ServiceContext, input: { departmentId: string; code: string; name: string; award: string; durationYears: number }) {
  assertRole(ctx.actor, 'super_admin', 'department_admin');
  assertCanManageDepartment(ctx.actor, input.departmentId);
  return ctx.db.transaction(async (tx) => {
    const [row] = await tx.insert(programs).values(input).returning({ id: programs.id });
    await audit(ctx, 'program.create', 'program', row!.id, input, tx);
    return row!;
  });
}

// ---------------------------------------------------------------- sessions & semesters

export async function listSessions(db: Executor) {
  const sessionRows = await db.select().from(academicSessions).orderBy(desc(academicSessions.startsOn));
  const semesterRows = await db.select().from(semesters);
  return sessionRows.map((s) => ({
    ...s,
    semesters: semesterRows.filter((m) => m.sessionId === s.id).sort((a, b) => a.term.localeCompare(b.term)),
  }));
}

/** Creates a session together with its two semesters. */
export async function createSession(ctx: ServiceContext, input: { name: string; startsOn: string; endsOn: string }) {
  assertRole(ctx.actor, 'super_admin');
  if (input.endsOn <= input.startsOn) throw invalid('The session must end after it starts.', { endsOn: 'Must be after the start date' });
  return ctx.db.transaction(async (tx) => {
    const [session] = await tx.insert(academicSessions).values(input).returning({ id: academicSessions.id });
    await tx.insert(semesters).values([
      { sessionId: session!.id, term: 'first' },
      { sessionId: session!.id, term: 'second' },
    ]);
    await audit(ctx, 'session.create', 'academic_session', session!.id, input, tx);
    return session!;
  });
}

/** Makes one semester current. Clearing the old one and setting the new one is atomic. */
export async function setCurrentSemester(ctx: ServiceContext, semesterId: string) {
  assertRole(ctx.actor, 'super_admin');
  await ctx.db.transaction(async (tx) => {
    const [target] = await tx.select({ id: semesters.id }).from(semesters).where(eq(semesters.id, semesterId)).for('update');
    if (!target) throw notFound('Semester');
    await tx.update(semesters).set({ isCurrent: false, registrationOpen: false }).where(and(eq(semesters.isCurrent, true), ne(semesters.id, semesterId)));
    await tx.update(semesters).set({ isCurrent: true }).where(eq(semesters.id, semesterId));
    await audit(ctx, 'semester.set_current', 'semester', semesterId, undefined, tx);
  });
}

export async function setRegistrationOpen(ctx: ServiceContext, semesterId: string, open: boolean) {
  assertRole(ctx.actor, 'super_admin');
  await ctx.db.transaction(async (tx) => {
    const [semester] = await tx.select().from(semesters).where(eq(semesters.id, semesterId)).for('update');
    if (!semester) throw notFound('Semester');
    if (open && !semester.isCurrent) throw conflict('Registration can only be opened for the current semester.');
    await tx.update(semesters).set({ registrationOpen: open }).where(eq(semesters.id, semesterId));
    await audit(ctx, open ? 'semester.open_registration' : 'semester.close_registration', 'semester', semesterId, undefined, tx);
  });
}

// ---------------------------------------------------------------- courses

export async function listCourses(db: Executor, departmentId?: string | null) {
  const current = await findCurrentSemester(db);
  return db
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
      units: courses.units,
      level: courses.level,
      term: courses.term,
      isActive: courses.isActive,
      departmentId: courses.departmentId,
      departmentName: departments.name,
      offeringId: courseOfferings.id,
      lecturers: sql<{ id: string; name: string }[]>`(
        select coalesce(json_agg(json_build_object('id', u.id, 'name', u.first_name || ' ' || u.last_name) order by u.last_name), '[]'::json)
        from ${courseAllocations} a join ${users} u on u.id = a.lecturer_id
        where a.offering_id = ${courseOfferings.id})`,
      registered: sql<number>`(select count(*)::int from ${registrations} r where r.offering_id = ${courseOfferings.id})`,
    })
    .from(courses)
    .innerJoin(departments, eq(departments.id, courses.departmentId))
    .leftJoin(courseOfferings, and(eq(courseOfferings.courseId, courses.id), eq(courseOfferings.semesterId, current?.id ?? sql`null`)))
    .where(departmentId ? eq(courses.departmentId, departmentId) : undefined)
    .orderBy(asc(courses.level), asc(courses.code));
}

export async function createCourse(
  ctx: ServiceContext,
  input: { departmentId: string; code: string; title: string; units: number; level: number; term: 'first' | 'second'; programIds: string[] },
) {
  assertRole(ctx.actor, 'super_admin', 'department_admin');
  assertCanManageDepartment(ctx.actor, input.departmentId);
  const { programIds, ...course } = input;
  return ctx.db.transaction(async (tx) => {
    if (programIds.length) {
      const owned = await tx.select({ id: programs.id, departmentId: programs.departmentId }).from(programs);
      const allowed = new Set(owned.filter((p) => p.departmentId === input.departmentId).map((p) => p.id));
      if (programIds.some((id) => !allowed.has(id))) throw forbidden('Courses can only be attached to programs of the same department.');
    }
    const [row] = await tx.insert(courses).values({ ...course, code: course.code.toUpperCase() }).returning({ id: courses.id });
    if (programIds.length) await tx.insert(programCourses).values(programIds.map((programId) => ({ programId, courseId: row!.id })));
    await audit(ctx, 'course.create', 'course', row!.id, input, tx);
    return row!;
  });
}

async function courseDepartment(db: Executor, courseId: string) {
  const [row] = await db.select({ departmentId: courses.departmentId, code: courses.code }).from(courses).where(eq(courses.id, courseId));
  if (!row) throw notFound('Course');
  return row;
}

export async function setCourseActive(ctx: ServiceContext, courseId: string, isActive: boolean) {
  assertRole(ctx.actor, 'super_admin', 'department_admin');
  const course = await courseDepartment(ctx.db, courseId);
  assertCanManageDepartment(ctx.actor, course.departmentId);
  await ctx.db.transaction(async (tx) => {
    await tx.update(courses).set({ isActive }).where(eq(courses.id, courseId));
    await audit(ctx, isActive ? 'course.activate' : 'course.deactivate', 'course', courseId, { code: course.code }, tx);
  });
}

/** Offers a course in the current semester (idempotent). */
export async function offerCourse(ctx: ServiceContext, courseId: string) {
  assertRole(ctx.actor, 'super_admin', 'department_admin');
  const course = await courseDepartment(ctx.db, courseId);
  assertCanManageDepartment(ctx.actor, course.departmentId);
  return ctx.db.transaction(async (tx) => {
    const semester = await requireCurrentSemester(tx);
    const [courseRow] = await tx.select({ term: courses.term, isActive: courses.isActive }).from(courses).where(eq(courses.id, courseId));
    if (!courseRow?.isActive) throw conflict('Inactive courses cannot be offered.');
    if (courseRow.term !== semester.term) throw conflict(`${course.code} is a ${courseRow.term}-semester course.`);
    const [row] = await tx
      .insert(courseOfferings)
      .values({ courseId, semesterId: semester.id })
      .onConflictDoNothing()
      .returning({ id: courseOfferings.id });
    if (row) await audit(ctx, 'course.offer', 'course_offering', row.id, { code: course.code, semesterId: semester.id }, tx);
    return row ?? null;
  });
}

/** Assigns a lecturer of the course's department to a current offering. */
export async function allocateLecturer(ctx: ServiceContext, input: { offeringId: string; lecturerId: string }) {
  assertRole(ctx.actor, 'super_admin', 'department_admin');
  return ctx.db.transaction(async (tx) => {
    const [offering] = await tx
      .select({ departmentId: courses.departmentId, code: courses.code })
      .from(courseOfferings)
      .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
      .where(eq(courseOfferings.id, input.offeringId));
    if (!offering) throw notFound('Course offering');
    assertCanManageDepartment(ctx.actor, offering.departmentId);

    const [lecturer] = await tx
      .select({ departmentId: users.departmentId, status: users.status })
      .from(lecturers)
      .innerJoin(users, eq(users.id, lecturers.userId))
      .where(eq(lecturers.userId, input.lecturerId));
    if (!lecturer) throw notFound('Lecturer');
    if (lecturer.departmentId !== offering.departmentId) throw forbidden('Only lecturers of the same department can be assigned to this course.');
    if (lecturer.status !== 'active') throw conflict('This lecturer account is not active.');

    await tx.insert(courseAllocations).values({ ...input, assignedBy: ctx.actor.id }).onConflictDoNothing();
    await audit(ctx, 'course.allocate', 'course_offering', input.offeringId, { code: offering.code, lecturerId: input.lecturerId }, tx);
  });
}

export async function unallocateLecturer(ctx: ServiceContext, input: { offeringId: string; lecturerId: string }) {
  assertRole(ctx.actor, 'super_admin', 'department_admin');
  await ctx.db.transaction(async (tx) => {
    const [offering] = await tx
      .select({ departmentId: courses.departmentId, code: courses.code })
      .from(courseOfferings)
      .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
      .where(eq(courseOfferings.id, input.offeringId));
    if (!offering) throw notFound('Course offering');
    assertCanManageDepartment(ctx.actor, offering.departmentId);
    await tx.delete(courseAllocations).where(and(eq(courseAllocations.offeringId, input.offeringId), eq(courseAllocations.lecturerId, input.lecturerId)));
    await audit(ctx, 'course.unallocate', 'course_offering', input.offeringId, { code: offering.code, lecturerId: input.lecturerId }, tx);
  });
}

export async function offeringAllocations(db: Executor, offeringId: string) {
  return db
    .select({ lecturerId: users.id, name: sql<string>`${users.firstName} || ' ' || ${users.lastName}` })
    .from(courseAllocations)
    .innerJoin(users, eq(users.id, courseAllocations.lecturerId))
    .where(eq(courseAllocations.offeringId, offeringId));
}
