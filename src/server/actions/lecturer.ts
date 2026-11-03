'use server';

import { revalidatePath } from 'next/cache';
import { lecturerProfileSchema } from '@/lib/validation';
import { serviceContext } from '../auth/session';
import { updateOwnLecturerProfile } from '../services/user.service';
import { formAction } from './safe-action';

export const updateLecturerProfileAction = formAction(lecturerProfileSchema, async (input) => {
  await updateOwnLecturerProfile(await serviceContext('lecturer'), input);
  revalidatePath('/lecturer/profile');
  return 'Profile updated.';
});
