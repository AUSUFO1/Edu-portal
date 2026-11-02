/**
 * Database schema (PostgreSQL).
 *
 * Integrity rules live in the database as well as in the services: foreign keys, unique
 * constraints and CHECK constraints are the last line of defence against duplicates and
 * invalid data, even if two requests race each other.
 */
import { relations, sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------- enums

export const userRole = pgEnum('user_role', ['student', 'lecturer', 'department_admin', 'super_admin']);
export const accountStatus = pgEnum('account_status', ['active', 'suspended', 'deactivated']);
export const semesterTerm = pgEnum('semester_term', ['first', 'second']);
export const resultSheetStatus = pgEnum('result_sheet_status', ['draft', 'submitted', 'approved', 'rejected']);

export type UserRole = (typeof userRole.enumValues)[number];
export type ResultSheetStatusValue = (typeof resultSheetStatus.enumValues)[number];

// ---------------------------------------------------------------- academic structure

export const faculties = pgTable('faculties', {
  id: id(),
  code: text('code').notNull().unique(),
  name: text('name').notNull().unique(),
  createdAt: createdAt(),
});

export const departments = pgTable(
  'departments',
  {
    id: id(),
    facultyId: uuid('faculty_id')
      .notNull()
      .references(() => faculties.id, { onDelete: 'restrict' }),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('departments_faculty_name_key').on(t.facultyId, t.name)],
);

export const programs = pgTable(
  'programs',
  {
    id: id(),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'restrict' }),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    award: text('award').notNull(),
    durationYears: smallint('duration_years').notNull(),
    createdAt: createdAt(),
  },
  (t) => [check('programs_duration_check', sql`${t.durationYears} between 1 and 7`)],
);

export const academicSessions = pgTable(
  'academic_sessions',
  {
    id: id(),
    name: text('name').notNull().unique(),
    startsOn: date('starts_on').notNull(),
    endsOn: date('ends_on').notNull(),
    createdAt: createdAt(),
  },
  (t) => [check('academic_sessions_dates_check', sql`${t.endsOn} > ${t.startsOn}`)],
);

export const semesters = pgTable(
  'semesters',
  {
    id: id(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => academicSessions.id, { onDelete: 'restrict' }),
    term: semesterTerm('term').notNull(),
    isCurrent: boolean('is_current').notNull().default(false),
    registrationOpen: boolean('registration_open').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('semesters_session_term_key').on(t.sessionId, t.term),
    // At most one current semester across the whole university.
    uniqueIndex('semesters_single_current_key').on(t.isCurrent).where(sql`${t.isCurrent}`),
  ],
);

// ---------------------------------------------------------------- people

export const users = pgTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    role: userRole('role').notNull(),
    status: accountStatus('status').notNull().default('active'),
    departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'restrict' }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Emails are compared case-insensitively.
    uniqueIndex('users_email_key').on(sql`lower(${t.email})`),
    index('users_department_idx').on(t.departmentId),
    // Everyone except a super admin belongs to exactly one department.
    check('users_department_check', sql`${t.role} = 'super_admin' or ${t.departmentId} is not null`),
  ],
);

export const students = pgTable(
  'students',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    matricNumber: text('matric_number').notNull(),
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'restrict' }),
    level: smallint('level').notNull(),
    entryYear: smallint('entry_year').notNull(),
    phone: text('phone'),
    address: text('address'),
  },
  (t) => [
    uniqueIndex('students_matric_number_key').on(sql`upper(${t.matricNumber})`),
    index('students_program_idx').on(t.programId),
    check('students_level_check', sql`${t.level} in (100, 200, 300, 400, 500, 600, 700)`),
  ],
);

export const lecturers = pgTable(
  'lecturers',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    staffNumber: text('staff_number').notNull(),
    title: text('title').notNull(),
    rank: text('rank').notNull(),
    phone: text('phone'),
  },
  (t) => [uniqueIndex('lecturers_staff_number_key').on(sql`upper(${t.staffNumber})`)],
);

// ---------------------------------------------------------------- courses

export const courses = pgTable(
  'courses',
  {
    id: id(),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    title: text('title').notNull(),
    units: smallint('units').notNull(),
    level: smallint('level').notNull(),
    term: semesterTerm('term').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('courses_code_key').on(sql`upper(${t.code})`),
    index('courses_department_idx').on(t.departmentId),
    check('courses_units_check', sql`${t.units} between 1 and 6`),
    check('courses_level_check', sql`${t.level} in (100, 200, 300, 400, 500, 600, 700)`),
  ],
);

/** Which programs take a course (many-to-many). A course is only offered to these programs. */
export const programCourses = pgTable(
  'program_courses',
  {
    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    isCore: boolean('is_core').notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.programId, t.courseId] })],
);

/** A course running in a specific semester. Registrations and results hang off the offering. */
export const courseOfferings = pgTable(
  'course_offerings',
  {
    id: id(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('course_offerings_course_semester_key').on(t.courseId, t.semesterId)],
);

export const courseAllocations = pgTable(
  'course_allocations',
  {
    offeringId: uuid('offering_id')
      .notNull()
      .references(() => courseOfferings.id, { onDelete: 'cascade' }),
    lecturerId: uuid('lecturer_id')
      .notNull()
      .references(() => lecturers.userId, { onDelete: 'restrict' }),
    assignedBy: uuid('assigned_by').references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.offeringId, t.lecturerId] }), index('course_allocations_lecturer_idx').on(t.lecturerId)],
);

export const registrations = pgTable(
  'registrations',
  {
    id: id(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.userId, { onDelete: 'restrict' }),
    offeringId: uuid('offering_id')
      .notNull()
      .references(() => courseOfferings.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => [
    // A student can register a course only once per semester (the offering is per semester).
    uniqueIndex('registrations_student_offering_key').on(t.studentId, t.offeringId),
    index('registrations_offering_idx').on(t.offeringId),
  ],
);

// ---------------------------------------------------------------- results

export const gradeScale = pgTable(
  'grade_scale',
  {
    grade: text('grade').primaryKey(),
    minScore: smallint('min_score').notNull(),
    maxScore: smallint('max_score').notNull(),
    point: smallint('point').notNull(),
  },
  (t) => [
    check('grade_scale_range_check', sql`${t.minScore} >= 0 and ${t.maxScore} <= 100 and ${t.minScore} <= ${t.maxScore}`),
    check('grade_scale_point_check', sql`${t.point} between 0 and 5`),
  ],
);

/** One result sheet per course offering; moves draft -> submitted -> approved | rejected. */
export const resultSheets = pgTable(
  'result_sheets',
  {
    id: id(),
    offeringId: uuid('offering_id')
      .notNull()
      .unique()
      .references(() => courseOfferings.id, { onDelete: 'restrict' }),
    status: resultSheetStatus('status').notNull().default('draft'),
    // Optimistic concurrency: every state change bumps the version.
    version: integer('version').notNull().default(1),
    submittedBy: uuid('submitted_by').references(() => users.id),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewComment: text('review_comment'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('result_sheets_status_idx').on(t.status),
    check('result_sheets_rejection_comment_check', sql`${t.status} <> 'rejected' or ${t.reviewComment} is not null`),
  ],
);

export const results = pgTable(
  'results',
  {
    registrationId: uuid('registration_id')
      .primaryKey()
      .references(() => registrations.id, { onDelete: 'restrict' }),
    sheetId: uuid('sheet_id')
      .notNull()
      .references(() => resultSheets.id, { onDelete: 'restrict' }),
    caScore: numeric('ca_score', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    examScore: numeric('exam_score', { precision: 5, scale: 2, mode: 'number' }).notNull(),
    // Grade is stored with the score so later changes to the grading scale never rewrite history.
    grade: text('grade').notNull(),
    gradePoint: smallint('grade_point').notNull(),
    updatedBy: uuid('updated_by').references(() => users.id),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('results_sheet_idx').on(t.sheetId),
    check('results_ca_check', sql`${t.caScore} between 0 and 30`),
    check('results_exam_check', sql`${t.examScore} between 0 and 70`),
  ],
);

// ---------------------------------------------------------------- security

export const authSessions = pgTable(
  'auth_sessions',
  {
    // SHA-256 of the session token; the token itself only ever lives in the user's cookie.
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [index('auth_sessions_user_idx').on(t.userId)],
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    email: text('email').notNull(),
    ipAddress: inet('ip_address'),
    succeeded: boolean('succeeded').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('login_attempts_email_time_idx').on(sql`lower(${t.email})`, t.createdAt)],
);

/** Append-only (enforced by a trigger in the migrations): who did what, to which record, when. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: inet('ip_address'),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    index('audit_logs_actor_idx').on(t.actorId),
    index('audit_logs_created_idx').on(t.createdAt),
  ],
);

// ---------------------------------------------------------------- relations (for typed joins)

export const facultiesRelations = relations(faculties, ({ many }) => ({ departments: many(departments) }));
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  faculty: one(faculties, { fields: [departments.facultyId], references: [faculties.id] }),
  programs: many(programs),
  courses: many(courses),
}));
export const programsRelations = relations(programs, ({ one }) => ({
  department: one(departments, { fields: [programs.departmentId], references: [departments.id] }),
}));
export const usersRelations = relations(users, ({ one }) => ({
  department: one(departments, { fields: [users.departmentId], references: [departments.id] }),
  student: one(students, { fields: [users.id], references: [students.userId] }),
  lecturer: one(lecturers, { fields: [users.id], references: [lecturers.userId] }),
}));
export const studentsRelations = relations(students, ({ one }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  program: one(programs, { fields: [students.programId], references: [programs.id] }),
}));
export const lecturersRelations = relations(lecturers, ({ one }) => ({
  user: one(users, { fields: [lecturers.userId], references: [users.id] }),
}));
export const coursesRelations = relations(courses, ({ one }) => ({
  department: one(departments, { fields: [courses.departmentId], references: [departments.id] }),
}));
export const semestersRelations = relations(semesters, ({ one }) => ({
  session: one(academicSessions, { fields: [semesters.sessionId], references: [academicSessions.id] }),
}));
