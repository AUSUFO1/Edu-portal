'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { id, registerCoursesSchema, studentProfileSchema } from '@/lib/validation';
import { serviceContext } from '../auth/session';
import { dropCourse, registerCourses } from '../services/registration.service';
import { updateOwnStudentProfile } from '../services/user.service';
import { formAction } from './safe-action';

export const registerCoursesAction = formAction(registerCoursesSchema, async ({ offeringIds }) => {
  const result = await registerCourses(await serviceContext('student'), offeringIds);
  revalidatePath('/student', 'layout');
  return `Registered ${result.registered} course(s). You now carry ${result.totalUnits} units.`;
});

export const dropCourseAction = formAction(z.object({ offeringId: id }), async ({ offeringId }) => {
  await dropCourse(await serviceContext('student'), offeringId);
  revalidatePath('/student', 'layout');
  return 'Course dropped.';
});

export const updateProfileAction = formAction(studentProfileSchema, async (input) => {
  await updateOwnStudentProfile(await serviceContext('student'), input);
  revalidatePath('/student/profile');
  return 'Profile updated.';
});
