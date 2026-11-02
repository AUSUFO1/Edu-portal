import 'server-only';
import { forbidden } from '@/domain/errors';
import type { ServiceContext } from '../services/context';
import { serviceContext } from './session';

/** Service context for a department admin page, with the admin's own department resolved. */
export async function departmentContext(): Promise<ServiceContext & { departmentId: string }> {
  const ctx = await serviceContext('department_admin');
  if (!ctx.actor.departmentId) throw forbidden('Your account is not assigned to a department.');
  return { ...ctx, departmentId: ctx.actor.departmentId };
}
