/** Read-only reports. Department admins are scoped to their department; super admins see all. */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { assertCanManageDepartment, assertRole } from '../auth/policy';
import {
  academicSessions,
  auditLogs,
  courseOfferings,
  courses,
  departments,
  faculties,
  registrations,
  resultSheets,
  results,
  semesters,
  students,
  users,
} from '../db/schema';
import { findCurrentSemester } from './academic-calendar';
import type { ServiceContext } from './context';

/** Headline numbers for a dashboard; `departmentId` null means university-wide. */
export async function overview(ctx: ServiceContext, departmentId: string | null) {
  assertRole(ctx.actor, 'department_admin', 'super_admin');
  if (departmentId) assertCanManageDepartment(ctx.actor, departmentId);
  const semester = await findCurrentSemester(ctx.db);
  const inDept = (column: typeof users.departmentId | typeof courses.departmentId) => (departmentId ? eq(column, departmentId) : undefined);
  const count = sql<number>`count(*)::int`;
  const activePeople = (role: 'student' | 'lecturer') =>
    ctx.db.select({ n: count }).from(users).where(and(eq(users.role, role), eq(users.status, 'active'), inDept(users.departmentId)));
  const sheets = (status: 'submitted' | 'approved') =>
    ctx.db
      .select({ n: count })
      .from(resultSheets)
      .innerJoin(courseOfferings, eq(courseOfferings.id, resultSheets.offeringId))
      .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
      .where(and(eq(resultSheets.status, status), inDept(courses.departmentId)));

  const [studentCount, lecturerCount, courseCount, registrationCount, pending, approved, departmentCount] = await Promise.all([
    activePeople('student'),
    activePeople('lecturer'),
    ctx.db.select({ n: count }).from(courses).where(and(eq(courses.isActive, true), inDept(courses.departmentId))),
    semester
      ? ctx.db
          .select({ n: count })
          .from(registrations)
          .innerJoin(courseOfferings, eq(courseOfferings.id, registrations.offeringId))
          .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
          .where(and(eq(courseOfferings.semesterId, semester.id), inDept(courses.departmentId)))
      : Promise.resolve([{ n: 0 }]),
    sheets('submitted'),
    sheets('approved'),
    ctx.db.select({ n: count }).from(departments),
  ]);
  const n = (rows: { n: number }[]) => rows[0]?.n ?? 0;
  return {
    semester,
    students: n(studentCount),
    lecturers: n(lecturerCount),
    courses: n(courseCount),
    registrations: n(registrationCount),
    pending: n(pending),
    approved: n(approved),
    departments: n(departmentCount),
  };
}

/** Students per department and level. */
export async function enrolmentByLevel(ctx: ServiceContext, departmentId: string | null) {
  assertRole(ctx.actor, 'department_admin', 'super_admin');
  if (departmentId) assertCanManageDepartment(ctx.actor, departmentId);
  return ctx.db
    .select({ departmentName: departments.name, level: students.level, count: sql<number>`count(*)::int` })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(departments, eq(departments.id, users.departmentId))
    .where(and(eq(users.status, 'active'), departmentId ? eq(users.departmentId, departmentId) : undefined))
    .groupBy(departments.name, students.level)
    .orderBy(asc(departments.name), asc(students.level));
}

/** Registrations per course in the current semester. */
export async function registrationReport(ctx: ServiceContext, departmentId: string | null) {
  assertRole(ctx.actor, 'department_admin', 'super_admin');
  if (departmentId) assertCanManageDepartment(ctx.actor, departmentId);
  const semester = await findCurrentSemester(ctx.db);
  if (!semester) return [];
  return ctx.db
    .select({
      offeringId: courseOfferings.id,
      code: courses.code,
      title: courses.title,
      units: courses.units,
      level: courses.level,
      departmentName: departments.name,
      registered: sql<number>`count(${registrations.id})::int`,
    })
    .from(courseOfferings)
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .innerJoin(departments, eq(departments.id, courses.departmentId))
    .leftJoin(registrations, eq(registrations.offeringId, courseOfferings.id))
    .where(and(eq(courseOfferings.semesterId, semester.id), departmentId ? eq(courses.departmentId, departmentId) : undefined))
    .groupBy(courseOfferings.id, courses.code, courses.title, courses.units, courses.level, departments.name)
    .orderBy(asc(courses.level), asc(courses.code));
}

/** Students registered for one course offering (class list for admins). */
export async function offeringRegistrations(ctx: ServiceContext, offeringId: string) {
  assertRole(ctx.actor, 'department_admin', 'super_admin');
  const [offering] = await ctx.db
    .select({ departmentId: courses.departmentId, code: courses.code, title: courses.title })
    .from(courseOfferings)
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(eq(courseOfferings.id, offeringId));
  if (!offering) return null;
  assertCanManageDepartment(ctx.actor, offering.departmentId);
  const list = await ctx.db
    .select({ matricNumber: students.matricNumber, firstName: users.firstName, lastName: users.lastName, level: students.level, registeredAt: registrations.createdAt })
    .from(registrations)
    .innerJoin(students, eq(students.userId, registrations.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(registrations.offeringId, offeringId))
    .orderBy(asc(students.matricNumber));
  return { offering, students: list };
}

/** Pass rate and average per approved course result. */
export async function performanceReport(ctx: ServiceContext, departmentId: string | null) {
  assertRole(ctx.actor, 'department_admin', 'super_admin');
  if (departmentId) assertCanManageDepartment(ctx.actor, departmentId);
  return ctx.db
    .select({
      code: courses.code,
      title: courses.title,
      sessionName: academicSessions.name,
      term: semesters.term,
      departmentName: departments.name,
      students: sql<number>`count(*)::int`,
      average: sql<number>`round(avg(${results.caScore} + ${results.examScore}), 1)::float`,
      passRate: sql<number>`round(100.0 * count(*) filter (where ${results.gradePoint} > 0) / count(*), 1)::float`,
    })
    .from(results)
    .innerJoin(resultSheets, eq(resultSheets.id, results.sheetId))
    .innerJoin(courseOfferings, eq(courseOfferings.id, resultSheets.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .innerJoin(departments, eq(departments.id, courses.departmentId))
    .innerJoin(semesters, eq(semesters.id, courseOfferings.semesterId))
    .innerJoin(academicSessions, eq(academicSessions.id, semesters.sessionId))
    .where(and(eq(resultSheets.status, 'approved'), departmentId ? eq(courses.departmentId, departmentId) : undefined))
    .groupBy(courses.code, courses.title, academicSessions.name, academicSessions.startsOn, semesters.term, departments.name)
    .orderBy(desc(academicSessions.startsOn), asc(courses.code));
}

/** Latest administrative actions (super admin). */
export async function recentActivity(ctx: ServiceContext, limit = 100) {
  assertRole(ctx.actor, 'super_admin');
  return ctx.db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      actorName: sql<string | null>`${users.firstName} || ' ' || ${users.lastName}`,
      actorRole: users.role,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.id))
    .limit(limit);
}

/** Faculties with their departments, for the university dashboard. */
export async function facultySummary(ctx: ServiceContext) {
  assertRole(ctx.actor, 'super_admin');
  return ctx.db
    .select({
      faculty: faculties.name,
      department: departments.name,
      departmentId: departments.id,
      students: sql<number>`(select count(*)::int from ${users} u where u.department_id = ${departments.id} and u.role = 'student')`,
      pending: sql<number>`(select count(*)::int from ${resultSheets} s join ${courseOfferings} o on o.id = s.offering_id join ${courses} c on c.id = o.course_id where c.department_id = ${departments.id} and s.status = 'submitted')`,
    })
    .from(departments)
    .innerJoin(faculties, eq(faculties.id, departments.facultyId))
    .orderBy(asc(faculties.name), asc(departments.name));
}
