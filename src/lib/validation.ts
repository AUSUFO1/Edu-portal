/**
 * Input schemas. Every server action parses its input with one of these before any service
 * runs; the database constraints repeat the same rules as a final safeguard.
 */
import { z } from 'zod';
import { LEVELS } from '@/domain/registration';

const trimmed = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

/** At least 10 characters with a letter and a number (NIST SP 800-63B favours length over complexity). */
export const newPassword = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const id = z.uuid('Invalid reference');
export const level = z.coerce.number().int().refine((v) => (LEVELS as readonly number[]).includes(v), 'Choose a valid level');
export const term = z.enum(['first', 'second'], 'Choose a semester');
const year = z.coerce.number().int().min(1960).max(2100);
const version = z.coerce.number().int().min(0);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

const person = {
  email,
  firstName: trimmed('First name', 60),
  lastName: trimmed('Last name', 60),
  password: newPassword,
};

export const createStudentSchema = z.object({
  ...person,
  matricNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9/-]{5,30}$/, 'Use letters, numbers, / or - (5-30 characters)'),
  programId: id,
  level,
  entryYear: year,
});

export const createLecturerSchema = z.object({
  ...person,
  departmentId: id,
  staffNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9/-]{3,30}$/, 'Use letters, numbers, / or - (3-30 characters)'),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Engr'], 'Choose a title'),
  rank: trimmed('Rank', 60),
});

export const createAdminSchema = z.object({
  ...person,
  role: z.enum(['department_admin', 'super_admin']),
  departmentId: id.nullable().optional().transform((v) => v ?? null),
});

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{7,20}$/, 'Enter a valid phone number, e.g. 0803 123 4567')
  .or(z.literal(''))
  .transform((v) => (v === '' ? null : v));

export const lecturerProfileSchema = z.object({ phone });

export const studentProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,20}$/, 'Enter a valid phone number')
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v)),
  address: optionalText(200),
});

export const facultySchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2,10}$/, 'Use 2-10 letters'),
  name: trimmed('Name', 120),
});

export const departmentSchema = facultySchema.extend({ facultyId: id });

export const programSchema = z.object({
  departmentId: id,
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,15}$/, 'Use 2-15 letters, numbers or -'),
  name: trimmed('Name', 120),
  award: z.enum(['B.Sc.', 'B.A.', 'B.Eng.', 'B.Tech.', 'LL.B.', 'MBBS', 'M.Sc.', 'Ph.D.'], 'Choose an award'),
  durationYears: z.coerce.number().int().min(1).max(7),
});

export const sessionSchema = z
  .object({
    name: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Use the format 2026/2027'),
    startsOn: z.iso.date('Enter a valid date'),
    endsOn: z.iso.date('Enter a valid date'),
  })
  .refine((s) => s.endsOn > s.startsOn, { path: ['endsOn'], message: 'Must be after the start date' })
  .refine((s) => Number(s.name.slice(5)) === Number(s.name.slice(0, 4)) + 1, { path: ['name'], message: 'The second year must follow the first' });

export const courseSchema = z.object({
  departmentId: id,
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2,4} ?\d{3}$/, 'Use a code like CSC 201'),
  title: trimmed('Title', 120),
  units: z.coerce.number().int().min(1).max(6),
  level,
  term,
  programIds: z.array(id).default([]),
});

export const allocationSchema = z.object({ offeringId: id, lecturerId: id });

export const registerCoursesSchema = z.object({
  offeringIds: z.array(id).default([]).pipe(z.array(id).min(1, 'Select at least one course to register.').max(15, 'You can register at most 15 courses at once.')),
});

/**
 * Score ranges (CA 0-30, exam 0-70, whole or half marks) are checked per cell by the result
 * service so each error can be shown next to the right student; here we only check the shape.
 * Blank or non-numeric cells arrive as NaN and are reported as missing.
 */
const rawScore = z.number().or(z.nan());

export const saveScoresSchema = z.object({
  offeringId: id,
  expectedVersion: version,
  intent: z.enum(['save', 'submit']),
  scores: z.array(z.object({ registrationId: id, caScore: rawScore, examScore: rawScore })).max(1000),
});

export const reviewSchema = z.object({
  sheetId: id,
  expectedVersion: version,
  decision: z.enum(['approve', 'reject', 'reopen']),
  comment: z.string().trim().max(1000).optional(),
});

export const accountStatusSchema = z.object({ userId: id, status: z.enum(['active', 'suspended', 'deactivated']) });
export const changeRoleSchema = z.object({ userId: id, role: z.enum(['lecturer', 'department_admin', 'super_admin']) });
export const resetPasswordSchema = z.object({ userId: id, password: newPassword });
