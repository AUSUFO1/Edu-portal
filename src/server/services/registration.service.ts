/**
 * Student course registration.
 *
 * Registration runs in a single transaction that first locks the student's row, so two
 * submissions from the same student (double click, two tabs) are applied one after the other:
 * the second sees the first's registrations and the unit total stays correct. The unique index
 * on (student_id, offering_id) is the final guarantee against duplicates.
 */
import { and, asc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { AppError, conflict, invalid, notFound } from '@/domain/errors';
import { checkUnitLoad } from '@/domain/registration';
import { assertRole } from '../auth/policy';
import type { Executor } from '../db/client';
import {
  courseOfferings,
  courses,
  programCourses,
  programs,
  registrations,
  resultSheets,
  results,
  semesters,
  students,
} from '../db/schema';
import { findCurrentSemester, requireCurrentSemester } from './academic-calendar';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export interface AvailableCourse {
  offeringId: string;
  code: string;
  title: string;
  units: number;
  level: number;
  isCore: boolean;
  isCarryOver: boolean;
  registered: boolean;
}

async function loadStudent(db: Executor, userId: string, lock = false) {
  const query = db
    .select({ userId: students.userId, programId: students.programId, level: students.level, departmentId: programs.departmentId })
    .from(students)
    .innerJoin(programs, eq(programs.id, students.programId))
    .where(eq(students.userId, userId));
  const [student] = await (lock ? query.for('update', { of: students }) : query);
  if (!student) throw notFound('Student record');
  return student;
}

/**
 * Courses this student may take in the current semester: courses of their program at their level
 * for this term, plus carry-overs (lower-level courses of this term they failed).
 */
async function availableCourses(db: Executor, student: { userId: string; programId: string; level: number }, semesterId: string) {
  const failedCourseIds = db
    .select({ courseId: courseOfferings.courseId })
    .from(results)
    .innerJoin(registrations, eq(registrations.id, results.registrationId))
    .innerJoin(courseOfferings, eq(courseOfferings.id, registrations.offeringId))
    .innerJoin(resultSheets, eq(resultSheets.id, results.sheetId))
    .where(and(eq(registrations.studentId, student.userId), eq(resultSheets.status, 'approved'), eq(results.gradePoint, 0)));

  const rows = await db
    .select({
      offeringId: courseOfferings.id,
      code: courses.code,
      title: courses.title,
      units: courses.units,
      level: courses.level,
      isCore: programCourses.isCore,
      isCarryOver: sql<boolean>`${courses.level} < ${student.level}`,
      registered: sql<boolean>`exists (select 1 from ${registrations} r where r.offering_id = ${courseOfferings.id} and r.student_id = ${student.userId})`,
    })
    .from(courseOfferings)
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .innerJoin(semesters, eq(semesters.id, courseOfferings.semesterId))
    .innerJoin(programCourses, and(eq(programCourses.courseId, courses.id), eq(programCourses.programId, student.programId)))
    .where(
      and(
        eq(courseOfferings.semesterId, semesterId),
        eq(courses.term, semesters.term),
        eq(courses.isActive, true),
        or(eq(courses.level, student.level), and(lt(courses.level, student.level), inArray(courses.id, failedCourseIds))),
      ),
    )
    .orderBy(asc(courses.level), asc(courses.code));
  return rows as AvailableCourse[];
}

export async function getRegistrationOverview(ctx: ServiceContext) {
  assertRole(ctx.actor, 'student');
  const semester = await findCurrentSemester(ctx.db);
  if (!semester) return { semester: null, courses: [] as AvailableCourse[], registeredUnits: 0 };
  const student = await loadStudent(ctx.db, ctx.actor.id);
  const list = await availableCourses(ctx.db, student, semester.id);
  const registeredUnits = list.filter((c) => c.registered).reduce((sum, c) => sum + c.units, 0);
  return { semester, courses: list, registeredUnits };
}

export async function registerCourses(ctx: ServiceContext, offeringIds: string[]) {
  assertRole(ctx.actor, 'student');
  const requested = [...new Set(offeringIds)];
  if (requested.length === 0) throw invalid('Select at least one course to register.');

  return ctx.db.transaction(async (tx) => {
    const student = await loadStudent(tx, ctx.actor.id, true);
    const semester = await requireCurrentSemester(tx);
    if (!semester.registrationOpen) throw conflict('Course registration is closed for this semester.');

    const available = await availableCourses(tx, student, semester.id);
    const byOffering = new Map(available.map((c) => [c.offeringId, c]));

    const notAllowed = requested.filter((id) => !byOffering.has(id));
    if (notAllowed.length) throw new AppError('FORBIDDEN', 'One or more selected courses are not available to you this semester.');

    const already = requested.map((id) => byOffering.get(id)!).filter((c) => c.registered);
    if (already.length) throw conflict(`You are already registered for ${already.map((c) => c.code).join(', ')}.`);

    const currentUnits = available.filter((c) => c.registered).reduce((sum, c) => sum + c.units, 0);
    const addedUnits = requested.reduce((sum, id) => sum + byOffering.get(id)!.units, 0);
    const loadError = checkUnitLoad(currentUnits, addedUnits);
    if (loadError) throw invalid(loadError);

    await tx.insert(registrations).values(requested.map((offeringId) => ({ studentId: student.userId, offeringId })));
    await recordAudit(tx, {
      actorId: ctx.actor.id,
      action: 'registration.create',
      entityType: 'student',
      entityId: student.userId,
      details: { semesterId: semester.id, courses: requested.map((id) => byOffering.get(id)!.code), totalUnits: currentUnits + addedUnits },
      ipAddress: ctx.ipAddress,
    });
    return { registered: requested.length, totalUnits: currentUnits + addedUnits };
  });
}

export async function dropCourse(ctx: ServiceContext, offeringId: string) {
  assertRole(ctx.actor, 'student');
  return ctx.db.transaction(async (tx) => {
    await loadStudent(tx, ctx.actor.id, true);
    const semester = await requireCurrentSemester(tx);
    if (!semester.registrationOpen) throw conflict('Course registration is closed; courses can no longer be dropped.');

    const [registration] = await tx
      .select({ id: registrations.id, code: courses.code, semesterId: courseOfferings.semesterId })
      .from(registrations)
      .innerJoin(courseOfferings, eq(courseOfferings.id, registrations.offeringId))
      .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
      .where(and(eq(registrations.studentId, ctx.actor.id), eq(registrations.offeringId, offeringId)));
    if (!registration || registration.semesterId !== semester.id) throw notFound('Registration');

    const [scored] = await tx.select({ id: results.registrationId }).from(results).where(eq(results.registrationId, registration.id));
    if (scored) throw conflict(`Scores have already been recorded for ${registration.code}; it can no longer be dropped.`);

    await tx.delete(registrations).where(eq(registrations.id, registration.id));
    await recordAudit(tx, {
      actorId: ctx.actor.id,
      action: 'registration.drop',
      entityType: 'student',
      entityId: ctx.actor.id,
      details: { course: registration.code, semesterId: semester.id },
      ipAddress: ctx.ipAddress,
    });
  });
}

/** Registered courses of a student for one semester (the registration slip). */
export async function registeredCourses(db: Executor, studentId: string, semesterId: string) {
  return db
    .select({ code: courses.code, title: courses.title, units: courses.units, level: courses.level, registeredAt: registrations.createdAt })
    .from(registrations)
    .innerJoin(courseOfferings, eq(courseOfferings.id, registrations.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .where(and(eq(registrations.studentId, studentId), eq(courseOfferings.semesterId, semesterId)))
    .orderBy(asc(courses.code));
}
