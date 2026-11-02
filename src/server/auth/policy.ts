/**
 * Authorization rules. Every service calls these on the server with the record actually being
 * touched (looked up from the database), never with IDs or roles taken on trust from the browser.
 */
import { forbidden } from '@/domain/errors';
import type { Role } from '@/domain/roles';
import type { Actor } from './actor';

export function assertRole(actor: Actor, ...roles: Role[]) {
  if (!roles.includes(actor.role)) throw forbidden();
}

/** Super admins manage every department; department admins only their own. */
export function canManageDepartment(actor: Actor, departmentId: string) {
  if (actor.role === 'super_admin') return true;
  return actor.role === 'department_admin' && actor.departmentId === departmentId;
}

export function assertCanManageDepartment(actor: Actor, departmentId: string) {
  if (!canManageDepartment(actor, departmentId)) {
    throw forbidden('You can only manage records in your own department.');
  }
}

/** The department an admin is scoped to; super admins may pass any department explicitly. */
export function scopedDepartmentId(actor: Actor, requested?: string | null): string | null {
  if (actor.role === 'super_admin') return requested ?? null;
  if (actor.role === 'department_admin') return actor.departmentId;
  throw forbidden();
}
