import type { Role } from './roles';

/** Set NEXT_PUBLIC_UNIVERSITY_NAME to brand the portal for a real institution. */
export const UNIVERSITY_NAME = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || 'Crestfield University';

export const PORTALS = ['student', 'staff', 'admin'] as const;
export type Portal = (typeof PORTALS)[number];

/** Each portal signs in only its own roles, so staff and students never share a door. */
export const PORTAL_ROLES: Record<Portal, readonly Role[]> = {
  student: ['student'],
  staff: ['lecturer', 'department_admin'],
  admin: ['super_admin'],
};

export const PORTAL_LABEL: Record<Portal, string> = {
  student: 'Student Portal',
  staff: 'Staff Portal',
  admin: 'Admin Portal',
};

export const PORTAL_HINT: Record<Portal, string> = {
  student: 'Sign in with your student email and password.',
  staff: 'For lecturers and department administrators.',
  admin: 'For the registry and system administrators.',
};

export function portalFor(role: Role): Portal {
  return role === 'student' ? 'student' : role === 'super_admin' ? 'admin' : 'staff';
}

export const isPortal = (value: string): value is Portal => (PORTALS as readonly string[]).includes(value);
