/**
 * Demo data so every workflow can be tried straight away:
 *  - 2 faculties, 3 departments, 3 programs, the grading scale
 *  - 2025/2026 completed (approved results, so students have a GPA and one has a carry-over)
 *  - 2026/2027 first semester current, registration open
 *  - result sheets in every state: approved, submitted (awaiting approval), returned, draft
 * All demo accounts share one password, listed in the README.
 */
import { eq } from 'drizzle-orm';
import { DEFAULT_GRADE_SCALE, gradeFor, totalScore } from '../src/domain/grading';
import { hashPassword } from '../src/server/auth/password';
import type { Database } from '../src/server/db/client';
import * as t from '../src/server/db/schema';

export const DEMO_PASSWORD = 'Portal@2026';

type Term = 'first' | 'second';

/** Deterministic pseudo-random numbers so every reseed gives the same scores. */
function scores(seed: number) {
  let x = seed;
  const next = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return () => {
    const ca = Math.round((12 + next() * 17) * 2) / 2;
    const exam = Math.round((22 + next() * 46) * 2) / 2;
    return { ca: Math.min(ca, 30), exam: Math.min(exam, 70) };
  };
}

export async function seed(db: Database) {
  const existing = await db.select({ id: t.users.id }).from(t.users).limit(1);
  if (existing.length) {
    console.log('Database already has users; skipping seed. Use `npm run db:reset` to start over.');
    return;
  }
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await db.insert(t.gradeScale).values([...DEFAULT_GRADE_SCALE]);

  // ---------------------------------------------------------------- structure
  const [science, social] = await db
    .insert(t.faculties)
    .values([
      { code: 'SCI', name: 'Faculty of Science' },
      { code: 'SSC', name: 'Faculty of Social Sciences' },
    ])
    .returning();
  const [csc, mth, eco] = await db
    .insert(t.departments)
    .values([
      { facultyId: science!.id, code: 'CSC', name: 'Computer Science' },
      { facultyId: science!.id, code: 'MTH', name: 'Mathematics' },
      { facultyId: social!.id, code: 'ECO', name: 'Economics' },
    ])
    .returning();
  const [bscCsc, bscMth, bscEco] = await db
    .insert(t.programs)
    .values([
      { departmentId: csc!.id, code: 'BSC-CSC', name: 'Computer Science', award: 'B.Sc.', durationYears: 4 },
      { departmentId: mth!.id, code: 'BSC-MTH', name: 'Mathematics', award: 'B.Sc.', durationYears: 4 },
      { departmentId: eco!.id, code: 'BSC-ECO', name: 'Economics', award: 'B.Sc.', durationYears: 4 },
    ])
    .returning();

  // ---------------------------------------------------------------- calendar
  const [past, current] = await db
    .insert(t.academicSessions)
    .values([
      { name: '2025/2026', startsOn: '2025-10-06', endsOn: '2026-08-28' },
      { name: '2026/2027', startsOn: '2026-10-05', endsOn: '2027-08-27' },
    ])
    .returning();
  const semesterRows = await db
    .insert(t.semesters)
    .values([
      { sessionId: past!.id, term: 'first' },
      { sessionId: past!.id, term: 'second' },
      { sessionId: current!.id, term: 'first', isCurrent: true, registrationOpen: true },
      { sessionId: current!.id, term: 'second' },
    ])
    .returning();
  const [pastFirst, pastSecond, currentFirst] = semesterRows;

  // ---------------------------------------------------------------- courses
  const courseSpecs: [typeof csc, typeof bscCsc, string, string, number, number, Term][] = [
    [csc, bscCsc, 'CSC 101', 'Introduction to Computing', 3, 100, 'first'],
    [csc, bscCsc, 'CSC 103', 'Programming Fundamentals', 3, 100, 'first'],
    [csc, bscCsc, 'CSC 105', 'Discrete Structures', 3, 100, 'first'],
    [csc, bscCsc, 'CSC 107', 'Computer Laboratory I', 2, 100, 'first'],
    [csc, bscCsc, 'CSC 109', 'Digital Logic Design', 3, 100, 'first'],
    [csc, bscCsc, 'CSC 111', 'Communication in English', 2, 100, 'first'],
    [csc, bscCsc, 'CSC 102', 'Introduction to Problem Solving', 3, 100, 'second'],
    [csc, bscCsc, 'CSC 104', 'Programming in Python', 3, 100, 'second'],
    [csc, bscCsc, 'CSC 106', 'Linear Algebra for Computing', 3, 100, 'second'],
    [csc, bscCsc, 'CSC 108', 'Computer Laboratory II', 2, 100, 'second'],
    [csc, bscCsc, 'CSC 112', 'Introduction to Statistics', 3, 100, 'second'],
    [csc, bscCsc, 'CSC 114', 'Nigerian Peoples and Culture', 2, 100, 'second'],
    [csc, bscCsc, 'CSC 201', 'Data Structures', 3, 200, 'first'],
    [csc, bscCsc, 'CSC 203', 'Object-Oriented Programming', 3, 200, 'first'],
    [csc, bscCsc, 'CSC 205', 'Computer Architecture', 3, 200, 'first'],
    [csc, bscCsc, 'CSC 207', 'Operating Systems I', 3, 200, 'first'],
    [csc, bscCsc, 'CSC 209', 'Numerical Methods', 3, 200, 'first'],
    [csc, bscCsc, 'CSC 211', 'Probability for Computing', 2, 200, 'first'],
    [csc, bscCsc, 'CSC 202', 'Algorithms', 3, 200, 'second'],
    [csc, bscCsc, 'CSC 204', 'Database Systems', 3, 200, 'second'],
    [mth, bscMth, 'MTH 101', 'Elementary Mathematics I', 3, 100, 'first'],
    [mth, bscMth, 'MTH 103', 'Vectors and Geometry', 3, 100, 'first'],
    [mth, bscMth, 'MTH 105', 'Set Theory and Logic', 3, 100, 'first'],
    [mth, bscMth, 'MTH 107', 'Mechanics I', 3, 100, 'first'],
    [mth, bscMth, 'MTH 109', 'Introductory Statistics', 3, 100, 'first'],
    [eco, bscEco, 'ECO 101', 'Principles of Economics I', 3, 100, 'first'],
    [eco, bscEco, 'ECO 103', 'Introduction to Accounting', 3, 100, 'first'],
    [eco, bscEco, 'ECO 105', 'Mathematics for Economists', 3, 100, 'first'],
    [eco, bscEco, 'ECO 107', 'Nigerian Economic History', 3, 100, 'first'],
    [eco, bscEco, 'ECO 109', 'Introduction to Sociology', 3, 100, 'first'],
  ];
  const courseRows = await db
    .insert(t.courses)
    .values(courseSpecs.map(([dept, , code, title, units, level, term]) => ({ departmentId: dept!.id, code, title, units, level, term })))
    .returning();
  await db.insert(t.programCourses).values(courseRows.map((c, i) => ({ programId: courseSpecs[i]![1]!.id, courseId: c.id })));
  const course = (code: string) => courseRows.find((c) => c.code === code)!;

  // ---------------------------------------------------------------- people
  const person = (email: string, firstName: string, lastName: string, role: t.UserRole, departmentId: string | null) => ({
    email,
    firstName,
    lastName,
    role,
    departmentId,
    passwordHash,
  });

  await db.insert(t.users).values(person('registrar@uemp.edu.ng', 'Halima', 'Bello', 'super_admin', null));
  await db.insert(t.users).values([
    person('hod.csc@uemp.edu.ng', 'Emeka', 'Okafor', 'department_admin', csc!.id),
    person('exams.csc@uemp.edu.ng', 'Grace', 'Adeyemi', 'department_admin', csc!.id),
    person('hod.mth@uemp.edu.ng', 'Musa', 'Ibrahim', 'department_admin', mth!.id),
    person('hod.eco@uemp.edu.ng', 'Ngozi', 'Eze', 'department_admin', eco!.id),
  ]);

  const lecturerSpecs: [string, string, string, string, typeof csc, string, string][] = [
    ['adebayo.ola@uemp.edu.ng', 'Adebayo', 'Ola', 'Dr', csc, 'STF/CSC/001', 'Senior Lecturer'],
    ['chioma.nwosu@uemp.edu.ng', 'Chioma', 'Nwosu', 'Dr', csc, 'STF/CSC/002', 'Lecturer I'],
    ['yakubu.sani@uemp.edu.ng', 'Yakubu', 'Sani', 'Prof', csc, 'STF/CSC/003', 'Professor'],
    ['funmi.alade@uemp.edu.ng', 'Funmilayo', 'Alade', 'Mrs', csc, 'STF/CSC/004', 'Lecturer II'],
    ['tunde.bakare@uemp.edu.ng', 'Tunde', 'Bakare', 'Dr', mth, 'STF/MTH/001', 'Senior Lecturer'],
    ['amaka.obi@uemp.edu.ng', 'Amaka', 'Obi', 'Dr', eco, 'STF/ECO/001', 'Lecturer I'],
  ];
  const lecturerUsers = await db
    .insert(t.users)
    .values(lecturerSpecs.map(([email, first, last, , dept]) => person(email, first, last, 'lecturer', dept!.id)))
    .returning();
  await db.insert(t.lecturers).values(lecturerUsers.map((u, i) => ({ userId: u.id, title: lecturerSpecs[i]![3], staffNumber: lecturerSpecs[i]![5], rank: lecturerSpecs[i]![6] })));
  const lecturer = (email: string) => lecturerUsers.find((u) => u.email === email)!.id;

  const studentSpecs: [string, string, typeof bscCsc, number, number][] = [
    ['Aisha', 'Mohammed', bscCsc, 200, 2025],
    ['Chinedu', 'Okeke', bscCsc, 200, 2025],
    ['Fatima', 'Abubakar', bscCsc, 200, 2025],
    ['Oluwaseun', 'Adebayo', bscCsc, 200, 2025],
    ['Ifeoma', 'Nnaji', bscCsc, 200, 2025],
    ['Ibrahim', 'Garba', bscCsc, 200, 2025],
    ['Blessing', 'Etim', bscCsc, 200, 2025],
    ['Kelechi', 'Uche', bscCsc, 200, 2025],
    ['Zainab', 'Lawal', bscCsc, 100, 2026],
    ['David', 'Akpan', bscCsc, 100, 2026],
    ['Esther', 'Olawale', bscCsc, 100, 2026],
    ['Samuel', 'Danjuma', bscCsc, 100, 2026],
    ['Hauwa', 'Usman', bscMth, 100, 2026],
    ['Peter', 'Ogunleye', bscMth, 100, 2026],
    ['Amina', 'Yusuf', bscEco, 100, 2026],
    ['Tobi', 'Fashola', bscEco, 100, 2026],
  ];
  const deptCode = (p: typeof bscCsc) => (p === bscCsc ? 'CSC' : p === bscMth ? 'MTH' : 'ECO');
  const deptOf = (p: typeof bscCsc) => (p === bscCsc ? csc : p === bscMth ? mth : eco)!.id;
  const studentUsers = await db
    .insert(t.users)
    .values(studentSpecs.map(([first, last, program]) => person(`${first}.${last}@student.uemp.edu.ng`.toLowerCase(), first, last, 'student', deptOf(program))))
    .returning();
  const counters: Record<string, number> = {};
  await db.insert(t.students).values(
    studentUsers.map((u, i) => {
      const [, , program, level, entryYear] = studentSpecs[i]!;
      const key = `${entryYear}${deptCode(program)}`;
      counters[key] = (counters[key] ?? 0) + 1;
      return {
        userId: u.id,
        matricNumber: `UNI/${entryYear}/${deptCode(program)}/${String(counters[key]).padStart(3, '0')}`,
        programId: program!.id,
        level,
        entryYear,
        phone: `0803 ${String(1000000 + i * 7919).slice(0, 3)} ${String(4000 + i * 37).slice(0, 4)}`,
      };
    }),
  );
  const cscYear2 = studentUsers.slice(0, 8).map((u) => u.id);
  const cscYear1 = studentUsers.slice(8, 12).map((u) => u.id);

  // ---------------------------------------------------------------- helpers
  async function offer(code: string, semesterId: string, lecturerEmail: string) {
    const [offering] = await db.insert(t.courseOfferings).values({ courseId: course(code).id, semesterId }).returning();
    await db.insert(t.courseAllocations).values({ offeringId: offering!.id, lecturerId: lecturer(lecturerEmail) });
    return offering!;
  }

  async function register(offeringId: string, studentIds: string[]) {
    if (!studentIds.length) return [];
    return db
      .insert(t.registrations)
      .values(studentIds.map((studentId) => ({ studentId, offeringId })))
      .returning();
  }

  async function grade(
    offeringId: string,
    regs: { id: string; studentId: string }[],
    lecturerEmail: string,
    status: t.ResultSheetStatusValue,
    seedNo: number,
    override: Record<string, { ca: number; exam: number }> = {},
    reviewer?: string,
    comment?: string,
  ) {
    const lecturerId = lecturer(lecturerEmail);
    const [sheet] = await db
      .insert(t.resultSheets)
      .values({
        offeringId,
        status,
        version: status === 'draft' ? 2 : 3,
        submittedBy: status === 'draft' ? null : lecturerId,
        submittedAt: status === 'draft' ? null : new Date(),
        reviewedBy: status === 'approved' || status === 'rejected' ? reviewer : null,
        reviewedAt: status === 'approved' || status === 'rejected' ? new Date() : null,
        reviewComment: comment ?? null,
      })
      .returning();
    const next = scores(seedNo);
    await db.insert(t.results).values(
      regs.map((r) => {
        const s = override[r.studentId] ?? next();
        const band = gradeFor(totalScore(s.ca, s.exam));
        return { registrationId: r.id, sheetId: sheet!.id, caScore: s.ca, examScore: s.exam, grade: band.grade, gradePoint: band.point, updatedBy: lecturerId };
      }),
    );
  }

  const [hodCsc] = await db.select({ id: t.users.id }).from(t.users).where(eq(t.users.email, 'hod.csc@uemp.edu.ng'));

  // ---------------------------------------------------------------- 2025/2026 (completed, approved)
  const failer = cscYear2[7]!; // Kelechi fails CSC 103 -> carry-over this session
  const pastPlan: [string, string, string][] = [
    ['CSC 101', pastFirst!.id, 'adebayo.ola@uemp.edu.ng'],
    ['CSC 103', pastFirst!.id, 'chioma.nwosu@uemp.edu.ng'],
    ['CSC 105', pastFirst!.id, 'yakubu.sani@uemp.edu.ng'],
    ['CSC 107', pastFirst!.id, 'funmi.alade@uemp.edu.ng'],
    ['CSC 109', pastFirst!.id, 'adebayo.ola@uemp.edu.ng'],
    ['CSC 111', pastFirst!.id, 'funmi.alade@uemp.edu.ng'],
    ['CSC 102', pastSecond!.id, 'chioma.nwosu@uemp.edu.ng'],
    ['CSC 104', pastSecond!.id, 'adebayo.ola@uemp.edu.ng'],
    ['CSC 106', pastSecond!.id, 'yakubu.sani@uemp.edu.ng'],
    ['CSC 108', pastSecond!.id, 'funmi.alade@uemp.edu.ng'],
    ['CSC 112', pastSecond!.id, 'yakubu.sani@uemp.edu.ng'],
    ['CSC 114', pastSecond!.id, 'funmi.alade@uemp.edu.ng'],
  ];
  let seedNo = 7;
  for (const [code, semesterId, email] of pastPlan) {
    const offering = await offer(code, semesterId, email);
    const regs = await register(offering.id, cscYear2);
    const override = code === 'CSC 103' ? { [failer]: { ca: 9, exam: 21 } } : {};
    await grade(offering.id, regs, email, 'approved', seedNo++, override, hodCsc!.id);
  }

  // ---------------------------------------------------------------- 2026/2027 first semester (current)
  const currentPlan: [string, string][] = [
    ['CSC 201', 'adebayo.ola@uemp.edu.ng'],
    ['CSC 203', 'chioma.nwosu@uemp.edu.ng'],
    ['CSC 205', 'yakubu.sani@uemp.edu.ng'],
    ['CSC 207', 'funmi.alade@uemp.edu.ng'],
    ['CSC 209', 'yakubu.sani@uemp.edu.ng'],
    ['CSC 211', 'funmi.alade@uemp.edu.ng'],
    ['CSC 101', 'adebayo.ola@uemp.edu.ng'],
    ['CSC 103', 'chioma.nwosu@uemp.edu.ng'],
    ['CSC 105', 'yakubu.sani@uemp.edu.ng'],
    ['CSC 107', 'funmi.alade@uemp.edu.ng'],
    ['CSC 109', 'adebayo.ola@uemp.edu.ng'],
    ['CSC 111', 'funmi.alade@uemp.edu.ng'],
    ['MTH 101', 'tunde.bakare@uemp.edu.ng'],
    ['MTH 103', 'tunde.bakare@uemp.edu.ng'],
    ['MTH 105', 'tunde.bakare@uemp.edu.ng'],
    ['MTH 107', 'tunde.bakare@uemp.edu.ng'],
    ['MTH 109', 'tunde.bakare@uemp.edu.ng'],
    ['ECO 101', 'amaka.obi@uemp.edu.ng'],
    ['ECO 103', 'amaka.obi@uemp.edu.ng'],
    ['ECO 105', 'amaka.obi@uemp.edu.ng'],
    ['ECO 107', 'amaka.obi@uemp.edu.ng'],
    ['ECO 109', 'amaka.obi@uemp.edu.ng'],
  ];
  const offerings: Record<string, string> = {};
  for (const [code, email] of currentPlan) offerings[code] = (await offer(code, currentFirst!.id, email)).id;

  // 200-level CSC students 1-6 have registered; 7 and 8 have not (to try the registration flow).
  const registered200 = cscYear2.slice(0, 6);
  const regs201 = await register(offerings['CSC 201']!, registered200);
  const regs203 = await register(offerings['CSC 203']!, registered200);
  const regs205 = await register(offerings['CSC 205']!, registered200);
  for (const code of ['CSC 207', 'CSC 209', 'CSC 211']) await register(offerings[code]!, registered200);
  // 100-level CSC students 1-3 registered; student 4 has not.
  for (const code of ['CSC 101', 'CSC 103', 'CSC 105', 'CSC 107', 'CSC 109', 'CSC 111']) await register(offerings[code]!, cscYear1.slice(0, 3));

  // Result sheets in each state of the workflow.
  await grade(offerings['CSC 201']!, regs201, 'adebayo.ola@uemp.edu.ng', 'submitted', 41);
  await grade(offerings['CSC 203']!, regs203, 'chioma.nwosu@uemp.edu.ng', 'rejected', 42, {}, hodCsc!.id, 'Please re-check the CA scores for UNI/2025/CSC/003 and UNI/2025/CSC/005 against the attendance record.');
  await grade(offerings['CSC 205']!, regs205.slice(0, 3), 'yakubu.sani@uemp.edu.ng', 'draft', 43);

  console.log(`Seeded ${studentUsers.length} students, ${lecturerUsers.length} lecturers, ${courseRows.length} courses. Demo password: ${DEMO_PASSWORD}`);
}
