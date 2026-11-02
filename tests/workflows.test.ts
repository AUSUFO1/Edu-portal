/**
 * End-to-end workflow and permission tests against a real (in-memory) Postgres with the
 * migrations, constraints, triggers and demo data. Each test reads like the brief's workflows.
 */
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppError } from '@/domain/errors';
import type { Database } from '@/server/db/client';
import * as t from '@/server/db/schema';
import { academicRecord } from '@/server/services/academic-record.service';
import { actorFromToken, signIn } from '@/server/services/auth.service';
import { getRegistrationOverview, registerCourses } from '@/server/services/registration.service';
import { approvedResultsFor, lecturerSheet, reviewResults, saveScores } from '@/server/services/result.service';
import { setRegistrationOpen } from '@/server/services/structure.service';
import { setAccountStatus } from '@/server/services/user.service';
import { DEMO_PASSWORD } from '../scripts/seed-data';
import { contextFor, createTestDatabase, EMAILS } from './support/database';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(async () => close());

const code = (error: unknown) => (error instanceof AppError ? error.code : String(error));

async function offeringFor(courseCode: string) {
  const [row] = await db
    .select({ id: t.courseOfferings.id })
    .from(t.courseOfferings)
    .innerJoin(t.courses, eq(t.courses.id, t.courseOfferings.courseId))
    .innerJoin(t.semesters, eq(t.semesters.id, t.courseOfferings.semesterId))
    .where(and(eq(t.courses.code, courseCode), eq(t.semesters.isCurrent, true)));
  return row!.id;
}

async function sheetFor(courseCode: string) {
  const [sheet] = await db.select().from(t.resultSheets).where(eq(t.resultSheets.offeringId, await offeringFor(courseCode)));
  return sheet!;
}

describe('Workflow 1: student course registration', () => {
  it('lists only courses for the student’s program, level and semester', async () => {
    const ctx = await contextFor(db, EMAILS.student200Unregistered);
    const { courses } = await getRegistrationOverview(ctx);
    expect(courses.map((c) => c.code)).toEqual(['CSC 201', 'CSC 203', 'CSC 205', 'CSC 207', 'CSC 209', 'CSC 211']);
    expect(courses.every((c) => !c.registered)).toBe(true);
  });

  it('includes a failed lower-level course as a carry-over', async () => {
    const ctx = await contextFor(db, EMAILS.studentWithCarryOver);
    const { courses } = await getRegistrationOverview(ctx);
    expect(courses.find((c) => c.code === 'CSC 103')).toMatchObject({ isCarryOver: true });
    expect(courses.some((c) => c.code === 'CSC 101')).toBe(false); // passed, so not offered again
  });

  it('registers courses and refuses to register the same course twice', async () => {
    const ctx = await contextFor(db, EMAILS.student200Unregistered);
    const csc201 = await offeringFor('CSC 201');
    await expect(registerCourses(ctx, [csc201, csc201])).resolves.toMatchObject({ registered: 1, totalUnits: 3 });
    await expect(registerCourses(ctx, [csc201])).rejects.toSatisfy((e) => code(e) === 'CONFLICT');
  });

  it('rejects courses from another department or level', async () => {
    const ctx = await contextFor(db, EMAILS.student200Unregistered);
    await expect(registerCourses(ctx, [await offeringFor('MTH 101')])).rejects.toSatisfy((e) => code(e) === 'FORBIDDEN');
    await expect(registerCourses(ctx, [await offeringFor('CSC 101')])).rejects.toSatisfy((e) => code(e) === 'FORBIDDEN');
  });

  it('stays correct when the same student submits twice at once', async () => {
    const ctx = await contextFor(db, EMAILS.student100Unregistered);
    const csc101 = await offeringFor('CSC 101');
    const outcomes = await Promise.allSettled([registerCourses(ctx, [csc101]), registerCourses(ctx, [csc101])]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    const [{ n } = { n: 0 }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(t.registrations)
      .where(and(eq(t.registrations.studentId, ctx.actor.id), eq(t.registrations.offeringId, csc101)));
    expect(n).toBe(1);
  });

  it('refuses registration when the registry has closed it', async () => {
    const admin = await contextFor(db, EMAILS.registrar);
    const [semester] = await db.select().from(t.semesters).where(eq(t.semesters.isCurrent, true));
    await setRegistrationOpen(admin, semester!.id, false);
    const ctx = await contextFor(db, EMAILS.student200Unregistered);
    await expect(registerCourses(ctx, [await offeringFor('CSC 203')])).rejects.toSatisfy((e) => code(e) === 'CONFLICT');
    await setRegistrationOpen(admin, semester!.id, true);
  });

  it('does not let a lecturer or admin use the student endpoint', async () => {
    const lecturer = await contextFor(db, EMAILS.lecturerCsc201);
    await expect(registerCourses(lecturer, [await offeringFor('CSC 201')])).rejects.toSatisfy((e) => code(e) === 'FORBIDDEN');
  });
});

describe('Workflows 2 and 3: result submission and departmental approval', () => {
  it('lets a lecturer manage only courses assigned to them', async () => {
    const other = await contextFor(db, EMAILS.lecturerMth);
    await expect(lecturerSheet(other, await offeringFor('CSC 205'))).rejects.toSatisfy((e) => code(e) === 'FORBIDDEN');
  });

  it('saves drafts, rejects out-of-range scores and blocks incomplete submission', async () => {
    const ctx = await contextFor(db, EMAILS.lecturerCsc205);
    const offeringId = await offeringFor('CSC 205');
    const { rows, version } = await lecturerSheet(ctx, offeringId);
    expect(rows).toHaveLength(6);

    const bad = saveScores(ctx, { offeringId, submit: false, expectedVersion: version, scores: [{ registrationId: rows[0]!.registrationId, caScore: 31, examScore: 50 }] });
    await expect(bad).rejects.toSatisfy((e) => e instanceof AppError && e.code === 'VALIDATION' && Boolean(e.fieldErrors?.[`ca:${rows[0]!.registrationId}`]));

    // Only 3 of 6 students have scores in the seed, so submitting must fail and change nothing.
    await expect(saveScores(ctx, { offeringId, submit: true, expectedVersion: version, scores: [] })).rejects.toSatisfy((e) => code(e) === 'VALIDATION');
    expect((await sheetFor('CSC 205')).status).toBe('draft');
  });

  it('submits complete results, then locks them', async () => {
    const ctx = await contextFor(db, EMAILS.lecturerCsc205);
    const offeringId = await offeringFor('CSC 205');
    const { rows, version } = await lecturerSheet(ctx, offeringId);
    const scores = rows.map((r, i) => ({ registrationId: r.registrationId, caScore: 20 + (i % 5), examScore: 40 + i }));
    await expect(saveScores(ctx, { offeringId, submit: true, expectedVersion: version, scores })).resolves.toMatchObject({ status: 'submitted' });
    const again = await lecturerSheet(ctx, offeringId);
    await expect(saveScores(ctx, { offeringId, submit: false, expectedVersion: again.version, scores })).rejects.toSatisfy((e) => code(e) === 'CONFLICT');
  });

  it('refuses a stale version (someone else changed the sheet)', async () => {
    const admin = await contextFor(db, EMAILS.hodCsc);
    const sheet = await sheetFor('CSC 205');
    await expect(reviewResults(admin, { sheetId: sheet.id, decision: 'approve', expectedVersion: sheet.version - 1 })).rejects.toSatisfy((e) => code(e) === 'CONFLICT');
  });

  it('only lets an admin of the course’s own department decide', async () => {
    const sheet = await sheetFor('CSC 205');
    const otherDept = await contextFor(db, EMAILS.hodMth);
    const superAdmin = await contextFor(db, EMAILS.registrar);
    const lecturer = await contextFor(db, EMAILS.lecturerCsc205);
    for (const ctx of [otherDept, superAdmin, lecturer]) {
      await expect(reviewResults(ctx, { sheetId: sheet.id, decision: 'approve', expectedVersion: sheet.version })).rejects.toSatisfy((e) => code(e) === 'FORBIDDEN');
    }
  });

  it('requires a comment to return results, and hides unapproved results from students', async () => {
    const admin = await contextFor(db, EMAILS.hodCsc);
    const sheet = await sheetFor('CSC 205');
    await expect(reviewResults(admin, { sheetId: sheet.id, decision: 'reject', expectedVersion: sheet.version })).rejects.toSatisfy((e) => code(e) === 'VALIDATION');

    const student = await contextFor(db, EMAILS.student200Registered);
    const visible = await approvedResultsFor(db, student.actor.id);
    expect(visible.some((r) => r.code === 'CSC 205')).toBe(false);
  });

  it('approves results, which students can then see with their GPA', async () => {
    const admin = await contextFor(db, EMAILS.hodCsc);
    const sheet = await sheetFor('CSC 205');
    await expect(reviewResults(admin, { sheetId: sheet.id, decision: 'approve', expectedVersion: sheet.version })).resolves.toMatchObject({ status: 'approved' });

    const student = await contextFor(db, EMAILS.student200Registered);
    const record = await academicRecord(db, student.actor.id);
    expect(record.semesters.at(-1)!.courses.map((c) => c.code)).toContain('CSC 205');
    expect(record.cgpa).toBeGreaterThan(0);
  });

  it('records every step in the audit trail, which cannot be edited', async () => {
    const sheet = await sheetFor('CSC 205');
    const entries = await db.select({ action: t.auditLogs.action }).from(t.auditLogs).where(eq(t.auditLogs.entityId, sheet.id));
    expect(entries.map((e) => e.action)).toEqual(expect.arrayContaining(['results.submit', 'results.approve']));
    // Drizzle wraps the database error; the trigger's message is on the cause.
    const blockedByTrigger = (e: unknown) => /append-only/.test(String((e as { cause?: Error }).cause?.message));
    await expect(db.update(t.auditLogs).set({ action: 'tampered' }).where(eq(t.auditLogs.entityId, sheet.id))).rejects.toSatisfy(blockedByTrigger);
    await expect(db.delete(t.auditLogs).where(eq(t.auditLogs.entityId, sheet.id))).rejects.toSatisfy(blockedByTrigger);
  });

  it('logs each individual score change with its old value', async () => {
    const changes = await db.select().from(t.auditLogs).where(eq(t.auditLogs.action, 'result.score_changed'));
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0]!.details).toHaveProperty('old');
  });

  it('stops a department admin approving results they submitted themselves', async () => {
    // A department admin who also teaches: give the exams officer a lecturer profile and the CSC 207 course.
    const examsOfficer = await contextFor(db, EMAILS.examsCsc);
    await db.insert(t.lecturers).values({ userId: examsOfficer.actor.id, staffNumber: 'STF/CSC/099', title: 'Dr', rank: 'Lecturer I' });
    const offeringId = await offeringFor('CSC 207');
    await db.insert(t.courseAllocations).values({ offeringId, lecturerId: examsOfficer.actor.id });
    const asLecturer = { ...examsOfficer, actor: { ...examsOfficer.actor, role: 'lecturer' as const } };
    const { rows } = await lecturerSheet(asLecturer, offeringId);
    await saveScores(asLecturer, { offeringId, submit: true, expectedVersion: 0, scores: rows.map((r) => ({ registrationId: r.registrationId, caScore: 25, examScore: 50 })) });

    const sheet = await sheetFor('CSC 207');
    await expect(reviewResults(examsOfficer, { sheetId: sheet.id, decision: 'approve', expectedVersion: sheet.version })).rejects.toSatisfy((e) => code(e) === 'FORBIDDEN');
    const hod = await contextFor(db, EMAILS.hodCsc);
    await expect(reviewResults(hod, { sheetId: sheet.id, decision: 'approve', expectedVersion: sheet.version })).resolves.toMatchObject({ status: 'approved' });
  });
});

describe('Authentication and account security', () => {
  const meta = { ipAddress: '10.0.0.1', userAgent: 'vitest' };

  it('signs in with the right password and resolves the session', async () => {
    const session = await signIn(db, EMAILS.lecturerMth, DEMO_PASSWORD, meta);
    const actor = await actorFromToken(db, session.token);
    expect(actor?.role).toBe('lecturer');
  });

  it('only lets each portal sign in its own roles', async () => {
    await expect(signIn(db, EMAILS.lecturerMth, DEMO_PASSWORD, meta, 'student')).rejects.toSatisfy((e) => e instanceof AppError && /Staff Portal/.test(e.message));
    await expect(signIn(db, EMAILS.hodMth, DEMO_PASSWORD, meta, 'admin')).rejects.toSatisfy((e) => code(e) === 'FORBIDDEN');
    await expect(signIn(db, EMAILS.hodMth, DEMO_PASSWORD, meta, 'staff')).resolves.toMatchObject({ role: 'department_admin' });
    await expect(signIn(db, EMAILS.registrar, DEMO_PASSWORD, meta, 'admin')).resolves.toMatchObject({ role: 'super_admin' });
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await signIn(db, EMAILS.lecturerMth, 'not-the-password', meta).catch((e: AppError) => e.message);
    const unknown = await signIn(db, 'nobody@uemp.edu.ng', 'not-the-password', meta).catch((e: AppError) => e.message);
    expect(wrong).toBe(unknown);
  });

  it('locks an email out after repeated failures', async () => {
    const email = EMAILS.student100Unregistered;
    for (let i = 0; i < 5; i++) await signIn(db, email, 'wrong-password', { ...meta, ipAddress: `10.0.1.${i}` }).catch(() => {});
    await expect(signIn(db, email, DEMO_PASSWORD, meta)).rejects.toSatisfy((e) => code(e) === 'RATE_LIMITED');
  });

  it('ends the sessions of a suspended user immediately', async () => {
    const session = await signIn(db, EMAILS.student200Registered, DEMO_PASSWORD, meta);
    const admin = await contextFor(db, EMAILS.registrar);
    const student = await contextFor(db, EMAILS.student200Registered);
    await setAccountStatus(admin, student.actor.id, 'suspended');
    expect(await actorFromToken(db, session.token)).toBeNull();
    await expect(signIn(db, EMAILS.student200Registered, DEMO_PASSWORD, meta)).rejects.toSatisfy((e) => code(e) === 'FORBIDDEN');
  });

  it('only lets a super admin change account status', async () => {
    const hod = await contextFor(db, EMAILS.hodCsc);
    const student = await contextFor(db, EMAILS.student200Unregistered);
    await expect(setAccountStatus(hod, student.actor.id, 'suspended')).rejects.toSatisfy((e) => code(e) === 'FORBIDDEN');
  });
});
