/**
 * Result entry and the departmental approval workflow.
 *
 * Every state change runs in one transaction that locks the result sheet row (SELECT ... FOR
 * UPDATE) and checks the version the user was looking at. If someone else changed the sheet in
 * the meantime (two admins reviewing at once, a lecturer saving in two tabs) the second action is
 * refused instead of silently overwriting the first. The audit entry commits with the change.
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { conflict, forbidden, invalid, notFound } from '@/domain/errors';
import { CA_MAX, EXAM_MAX, gradeFor, totalScore, type GradeBand } from '@/domain/grading';
import { canPerform, isEditableByLecturer, nextStatus, type SheetAction, type SheetStatus } from '@/domain/result-sheet';
import { assertCanManageDepartment, assertRole } from '../auth/policy';
import type { Executor, Transaction } from '../db/client';
import {
  academicSessions,
  courseAllocations,
  courseOfferings,
  courses,
  departments,
  gradeScale,
  registrations,
  resultSheets,
  results,
  semesters,
  students,
  users,
} from '../db/schema';
import { recordAudit } from './audit';
import type { ServiceContext } from './context';

export interface ScoreInput {
  registrationId: string;
  caScore: number;
  examScore: number;
}

// ---------------------------------------------------------------- reads

async function offeringInfo(db: Executor, offeringId: string) {
  const [row] = await db
    .select({
      offeringId: courseOfferings.id,
      courseId: courses.id,
      code: courses.code,
      title: courses.title,
      units: courses.units,
      level: courses.level,
      departmentId: courses.departmentId,
      departmentName: departments.name,
      semesterId: semesters.id,
      term: semesters.term,
      isCurrent: semesters.isCurrent,
      sessionName: academicSessions.name,
    })
    .from(courseOfferings)
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .innerJoin(departments, eq(departments.id, courses.departmentId))
    .innerJoin(semesters, eq(semesters.id, courseOfferings.semesterId))
    .innerJoin(academicSessions, eq(academicSessions.id, semesters.sessionId))
    .where(eq(courseOfferings.id, offeringId));
  if (!row) throw notFound('Course offering');
  return row;
}

async function assertAllocated(db: Executor, lecturerId: string, offeringId: string) {
  const [allocation] = await db
    .select({ offeringId: courseAllocations.offeringId })
    .from(courseAllocations)
    .where(and(eq(courseAllocations.offeringId, offeringId), eq(courseAllocations.lecturerId, lecturerId)));
  if (!allocation) throw forbidden('You can only manage results for courses assigned to you.');
}

async function classList(db: Executor, offeringId: string) {
  return db
    .select({
      registrationId: registrations.id,
      matricNumber: students.matricNumber,
      firstName: users.firstName,
      lastName: users.lastName,
      level: students.level,
      caScore: results.caScore,
      examScore: results.examScore,
      grade: results.grade,
      gradePoint: results.gradePoint,
    })
    .from(registrations)
    .innerJoin(students, eq(students.userId, registrations.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .leftJoin(results, eq(results.registrationId, registrations.id))
    .where(eq(registrations.offeringId, offeringId))
    .orderBy(asc(students.matricNumber));
}

async function sheetForOffering(db: Executor, offeringId: string) {
  const [sheet] = await db.select().from(resultSheets).where(eq(resultSheets.offeringId, offeringId));
  return sheet ?? null;
}

/** Courses allocated to the signed-in lecturer, newest semester first. */
export async function lecturerCourses(ctx: ServiceContext) {
  assertRole(ctx.actor, 'lecturer');
  return ctx.db
    .select({
      offeringId: courseOfferings.id,
      code: courses.code,
      title: courses.title,
      units: courses.units,
      level: courses.level,
      term: semesters.term,
      isCurrent: semesters.isCurrent,
      sessionName: academicSessions.name,
      students: sql<number>`(select count(*)::int from ${registrations} r where r.offering_id = ${courseOfferings.id})`,
      status: resultSheets.status,
    })
    .from(courseAllocations)
    .innerJoin(courseOfferings, eq(courseOfferings.id, courseAllocations.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .innerJoin(semesters, eq(semesters.id, courseOfferings.semesterId))
    .innerJoin(academicSessions, eq(academicSessions.id, semesters.sessionId))
    .leftJoin(resultSheets, eq(resultSheets.offeringId, courseOfferings.id))
    .where(eq(courseAllocations.lecturerId, ctx.actor.id))
    .orderBy(desc(semesters.isCurrent), desc(academicSessions.startsOn), asc(courses.code));
}

/** Score sheet for a lecturer's course. */
export async function lecturerSheet(ctx: ServiceContext, offeringId: string) {
  assertRole(ctx.actor, 'lecturer');
  await assertAllocated(ctx.db, ctx.actor.id, offeringId);
  const [offering, rows, sheet] = await Promise.all([
    offeringInfo(ctx.db, offeringId),
    classList(ctx.db, offeringId),
    sheetForOffering(ctx.db, offeringId),
  ]);
  return { offering, rows, sheet, status: (sheet?.status ?? 'draft') as SheetStatus, version: sheet?.version ?? 0 };
}

/** Score sheet for review by the course's department admin (or read-only by a super admin). */
export async function reviewSheet(ctx: ServiceContext, sheetId: string) {
  assertRole(ctx.actor, 'department_admin', 'super_admin');
  const [sheet] = await ctx.db.select().from(resultSheets).where(eq(resultSheets.id, sheetId));
  if (!sheet) throw notFound('Result sheet');
  const offering = await offeringInfo(ctx.db, sheet.offeringId);
  assertCanManageDepartment(ctx.actor, offering.departmentId);
  const [rows, submitter, reviewer] = await Promise.all([
    classList(ctx.db, sheet.offeringId),
    sheet.submittedBy ? personName(ctx.db, sheet.submittedBy) : null,
    sheet.reviewedBy ? personName(ctx.db, sheet.reviewedBy) : null,
  ]);
  return { sheet, offering, rows, submitter, reviewer };
}

async function personName(db: Executor, userId: string) {
  const [u] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, userId));
  return u ? `${u.firstName} ${u.lastName}` : null;
}

/** Result sheets of a department (or all, for a super admin), optionally by status. */
export async function listSheets(ctx: ServiceContext, filter: { departmentId: string | null; status?: SheetStatus }) {
  assertRole(ctx.actor, 'department_admin', 'super_admin');
  if (filter.departmentId) assertCanManageDepartment(ctx.actor, filter.departmentId);
  const conditions = [
    filter.departmentId ? eq(courses.departmentId, filter.departmentId) : undefined,
    filter.status ? eq(resultSheets.status, filter.status) : undefined,
  ].filter(Boolean);
  return ctx.db
    .select({
      sheetId: resultSheets.id,
      status: resultSheets.status,
      submittedAt: resultSheets.submittedAt,
      reviewedAt: resultSheets.reviewedAt,
      code: courses.code,
      title: courses.title,
      departmentName: departments.name,
      sessionName: academicSessions.name,
      term: semesters.term,
      submittedBy: sql<string | null>`(select u.first_name || ' ' || u.last_name from ${users} u where u.id = ${resultSheets.submittedBy})`,
      students: sql<number>`(select count(*)::int from ${registrations} r where r.offering_id = ${resultSheets.offeringId})`,
    })
    .from(resultSheets)
    .innerJoin(courseOfferings, eq(courseOfferings.id, resultSheets.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .innerJoin(departments, eq(departments.id, courses.departmentId))
    .innerJoin(semesters, eq(semesters.id, courseOfferings.semesterId))
    .innerJoin(academicSessions, eq(academicSessions.id, semesters.sessionId))
    .where(and(...conditions))
    .orderBy(desc(resultSheets.submittedAt), asc(courses.code));
}

// ---------------------------------------------------------------- writes

async function loadScale(db: Executor): Promise<GradeBand[]> {
  const scale = await db.select().from(gradeScale);
  if (scale.length === 0) throw conflict('The grading scale has not been configured.');
  return scale;
}

/** Gets the sheet row locked for update, creating it on first use. */
async function lockSheet(tx: Transaction, offeringId: string) {
  await tx.insert(resultSheets).values({ offeringId }).onConflictDoNothing({ target: resultSheets.offeringId });
  const [sheet] = await tx.select().from(resultSheets).where(eq(resultSheets.offeringId, offeringId)).for('update');
  return sheet!;
}

function assertVersion(current: number, expected: number) {
  if (expected !== 0 && current !== expected) {
    throw conflict('This result sheet was changed by someone else since you opened it. Reload the page to see the latest version.');
  }
}

/** Per-cell validation: present, within range, whole or half marks. Errors are keyed by cell. */
function scoreError(value: number, max: number) {
  if (!Number.isFinite(value)) return 'Required';
  if (value < 0 || value > max) return `0-${max}`;
  if (!Number.isInteger(value * 2)) return 'Whole or half marks';
  return null;
}

function validateScores(scores: ScoreInput[]) {
  const fieldErrors: Record<string, string> = {};
  for (const s of scores) {
    const ca = scoreError(s.caScore, CA_MAX);
    const exam = scoreError(s.examScore, EXAM_MAX);
    if (ca) fieldErrors[`ca:${s.registrationId}`] = ca;
    if (exam) fieldErrors[`exam:${s.registrationId}`] = exam;
  }
  if (Object.keys(fieldErrors).length) throw invalid('Some scores are missing or out of range. Nothing was saved.', fieldErrors);
}

/**
 * Saves the lecturer's scores. With `submit`, also sends the sheet for departmental approval,
 * which requires a complete score for every registered student. All or nothing.
 */
export async function saveScores(ctx: ServiceContext, input: { offeringId: string; scores: ScoreInput[]; submit: boolean; expectedVersion: number }) {
  assertRole(ctx.actor, 'lecturer');
  validateScores(input.scores);

  return ctx.db.transaction(async (tx) => {
    await assertAllocated(tx, ctx.actor.id, input.offeringId);
    const sheet = await lockSheet(tx, input.offeringId);
    assertVersion(sheet.version, input.expectedVersion);
    if (!isEditableByLecturer(sheet.status)) {
      throw conflict(sheet.status === 'approved' ? 'These results are approved and locked. Ask your department admin to reopen them.' : 'These results are awaiting approval and cannot be changed.');
    }

    const enrolled = await tx.select({ id: registrations.id }).from(registrations).where(eq(registrations.offeringId, input.offeringId));
    const enrolledIds = new Set(enrolled.map((r) => r.id));
    if (input.scores.some((s) => !enrolledIds.has(s.registrationId))) {
      throw invalid('The score sheet includes a student who is not registered for this course. Reload and try again.');
    }

    const scale = await loadScale(tx);
    for (const s of input.scores) {
      const band = gradeFor(totalScore(s.caScore, s.examScore), scale);
      const values = { caScore: s.caScore, examScore: s.examScore, grade: band.grade, gradePoint: band.point, updatedBy: ctx.actor.id };
      await tx
        .insert(results)
        .values({ registrationId: s.registrationId, sheetId: sheet.id, ...values })
        .onConflictDoUpdate({ target: results.registrationId, set: values });
    }

    const action: SheetAction = input.submit ? 'submit' : 'edit';
    if (input.submit) {
      const [{ missing } = { missing: 0 }] = await tx
        .select({ missing: sql<number>`count(*)::int` })
        .from(registrations)
        .leftJoin(results, eq(results.registrationId, registrations.id))
        .where(and(eq(registrations.offeringId, input.offeringId), sql`${results.registrationId} is null`));
      if (missing > 0) throw invalid(`${missing} student(s) still have no scores. Enter every score before submitting.`);
    }

    const status = nextStatus(action, sheet.status);
    const [updated] = await tx
      .update(resultSheets)
      .set({
        status,
        version: sheet.version + 1,
        ...(input.submit ? { submittedBy: ctx.actor.id, submittedAt: new Date(), reviewedBy: null, reviewedAt: null } : {}),
      })
      .where(eq(resultSheets.id, sheet.id))
      .returning({ version: resultSheets.version, status: resultSheets.status });

    await recordAudit(tx, {
      actorId: ctx.actor.id,
      action: input.submit ? 'results.submit' : 'results.save_draft',
      entityType: 'result_sheet',
      entityId: sheet.id,
      details: { offeringId: input.offeringId, scoresSaved: input.scores.length, from: sheet.status, to: status },
      ipAddress: ctx.ipAddress,
    });
    return updated!;
  });
}

/** Department admin decision on a submitted sheet. */
export async function reviewResults(ctx: ServiceContext, input: { sheetId: string; decision: 'approve' | 'reject' | 'reopen'; comment?: string; expectedVersion: number }) {
  assertRole(ctx.actor, 'department_admin');
  const comment = input.comment?.trim() || null;
  if ((input.decision === 'reject' || input.decision === 'reopen') && !comment) {
    throw invalid(input.decision === 'reject' ? 'Explain what needs correcting so the lecturer can fix it.' : 'Give a reason for reopening approved results.', { comment: 'Required' });
  }

  return ctx.db.transaction(async (tx) => {
    const [sheet] = await tx.select().from(resultSheets).where(eq(resultSheets.id, input.sheetId)).for('update');
    if (!sheet) throw notFound('Result sheet');
    const offering = await offeringInfo(tx, sheet.offeringId);
    assertCanManageDepartment(ctx.actor, offering.departmentId);
    assertVersion(sheet.version, input.expectedVersion);

    if (!canPerform(input.decision, sheet.status)) {
      throw conflict(`These results are ${sheet.status} and cannot be ${input.decision === 'reopen' ? 'reopened' : `${input.decision}d`}.`);
    }
    if (input.decision !== 'reopen' && sheet.submittedBy === ctx.actor.id) {
      throw forbidden('You cannot review results you submitted yourself.');
    }

    const status = nextStatus(input.decision, sheet.status);
    const [updated] = await tx
      .update(resultSheets)
      .set({ status, version: sheet.version + 1, reviewedBy: ctx.actor.id, reviewedAt: new Date(), reviewComment: comment })
      .where(eq(resultSheets.id, sheet.id))
      .returning({ version: resultSheets.version, status: resultSheets.status });

    await recordAudit(tx, {
      actorId: ctx.actor.id,
      action: `results.${input.decision}`,
      entityType: 'result_sheet',
      entityId: sheet.id,
      details: { course: offering.code, session: offering.sessionName, from: sheet.status, to: status, comment },
      ipAddress: ctx.ipAddress,
    });
    return updated!;
  });
}

// ---------------------------------------------------------------- student view

/** A student's approved results, grouped by semester. Unapproved scores are never returned. */
export async function approvedResultsFor(db: Executor, studentId: string) {
  return db
    .select({
      semesterId: semesters.id,
      sessionName: academicSessions.name,
      sessionStartsOn: academicSessions.startsOn,
      term: semesters.term,
      code: courses.code,
      title: courses.title,
      units: courses.units,
      caScore: results.caScore,
      examScore: results.examScore,
      grade: results.grade,
      gradePoint: results.gradePoint,
    })
    .from(results)
    .innerJoin(resultSheets, eq(resultSheets.id, results.sheetId))
    .innerJoin(registrations, eq(registrations.id, results.registrationId))
    .innerJoin(courseOfferings, eq(courseOfferings.id, registrations.offeringId))
    .innerJoin(courses, eq(courses.id, courseOfferings.courseId))
    .innerJoin(semesters, eq(semesters.id, courseOfferings.semesterId))
    .innerJoin(academicSessions, eq(academicSessions.id, semesters.sessionId))
    .where(and(eq(registrations.studentId, studentId), eq(resultSheets.status, 'approved')))
    .orderBy(asc(academicSessions.startsOn), asc(semesters.term), asc(courses.code));
}
