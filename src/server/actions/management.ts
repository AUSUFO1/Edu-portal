'use server';

/**
 * Actions shared by department admins and super admins. The services enforce department scope,
 * so a department admin who tampers with a form to target another department is refused there.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  accountStatusSchema,
  allocationSchema,
  changeRoleSchema,
  courseSchema,
  createAdminSchema,
  createLecturerSchema,
  createStudentSchema,
  departmentSchema,
  facultySchema,
  id,
  programSchema,
  resetPasswordSchema,
  sessionSchema,
} from '@/lib/validation';
import { serviceContext } from '../auth/session';
import * as structure from '../services/structure.service';
import * as accounts from '../services/user.service';
import { formAction } from './safe-action';

const ADMINS = ['department_admin', 'super_admin'] as const;

function refresh() {
  revalidatePath('/department', 'layout');
  revalidatePath('/admin', 'layout');
}

// ---------------------------------------------------------------- people

export const createStudentAction = formAction(createStudentSchema, async (input) => {
  await accounts.createStudent(await serviceContext(...ADMINS), input);
  refresh();
  return `Student ${input.firstName} ${input.lastName} (${input.matricNumber}) created.`;
});

export const createLecturerAction = formAction(createLecturerSchema, async (input) => {
  await accounts.createLecturer(await serviceContext(...ADMINS), input);
  refresh();
  return `Lecturer ${input.title} ${input.firstName} ${input.lastName} created.`;
});

export const createAdminAction = formAction(createAdminSchema, async (input) => {
  await accounts.createAdmin(await serviceContext('super_admin'), input);
  refresh();
  return `Administrator ${input.firstName} ${input.lastName} created.`;
});

export const setAccountStatusAction = formAction(accountStatusSchema, async ({ userId, status }) => {
  await accounts.setAccountStatus(await serviceContext('super_admin'), userId, status);
  refresh();
  return status === 'active' ? 'Account activated.' : `Account ${status}. The user has been signed out.`;
});

export const changeRoleAction = formAction(changeRoleSchema, async ({ userId, role }) => {
  await accounts.changeRole(await serviceContext('super_admin'), userId, role);
  refresh();
  return 'Role updated. The user must sign in again.';
});

export const resetPasswordAction = formAction(resetPasswordSchema, async ({ userId, password }) => {
  await accounts.resetPassword(await serviceContext(...ADMINS), userId, password);
  return 'Password reset. Share the new password with the user securely.';
});

// ---------------------------------------------------------------- structure

export const createFacultyAction = formAction(facultySchema, async (input) => {
  await structure.createFaculty(await serviceContext('super_admin'), input);
  refresh();
  return `Faculty ${input.name} created.`;
});

export const createDepartmentAction = formAction(departmentSchema, async (input) => {
  await structure.createDepartment(await serviceContext('super_admin'), input);
  refresh();
  return `Department ${input.name} created.`;
});

export const createProgramAction = formAction(programSchema, async (input) => {
  await structure.createProgram(await serviceContext(...ADMINS), input);
  refresh();
  return `Program ${input.name} created.`;
});

export const createSessionAction = formAction(sessionSchema, async (input) => {
  await structure.createSession(await serviceContext('super_admin'), input);
  refresh();
  return `Session ${input.name} created with first and second semesters.`;
});

export const setCurrentSemesterAction = formAction(z.object({ semesterId: id }), async ({ semesterId }) => {
  await structure.setCurrentSemester(await serviceContext('super_admin'), semesterId);
  refresh();
  revalidatePath('/', 'layout');
  return 'Current semester updated.';
});

export const setRegistrationOpenAction = formAction(
  z.object({ semesterId: id, open: z.enum(['true', 'false']).transform((v) => v === 'true') }),
  async ({ semesterId, open }) => {
    await structure.setRegistrationOpen(await serviceContext('super_admin'), semesterId, open);
    revalidatePath('/', 'layout');
    return open ? 'Course registration is open.' : 'Course registration is closed.';
  },
);

export const createCourseAction = formAction(courseSchema, async (input) => {
  await structure.createCourse(await serviceContext(...ADMINS), input);
  refresh();
  return `Course ${input.code} created.`;
});

export const setCourseActiveAction = formAction(
  z.object({ courseId: id, active: z.enum(['true', 'false']).transform((v) => v === 'true') }),
  async ({ courseId, active }) => {
    await structure.setCourseActive(await serviceContext(...ADMINS), courseId, active);
    refresh();
    return active ? 'Course activated.' : 'Course deactivated.';
  },
);

export const offerCourseAction = formAction(z.object({ courseId: id }), async ({ courseId }) => {
  const offering = await structure.offerCourse(await serviceContext(...ADMINS), courseId);
  refresh();
  return offering ? 'Course offered this semester.' : 'The course is already offered this semester.';
});

export const allocateLecturerAction = formAction(allocationSchema, async (input) => {
  await structure.allocateLecturer(await serviceContext(...ADMINS), input);
  refresh();
  return 'Lecturer assigned.';
});

export const unallocateLecturerAction = formAction(allocationSchema, async (input) => {
  await structure.unallocateLecturer(await serviceContext(...ADMINS), input);
  refresh();
  return 'Lecturer removed from the course.';
});
