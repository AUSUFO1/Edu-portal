export const ROLES = ['student', 'lecturer', 'department_admin', 'super_admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  lecturer: 'Lecturer',
  department_admin: 'Department Admin',
  super_admin: 'Super Admin',
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  student: '/student',
  lecturer: '/lecturer',
  department_admin: '/department',
  super_admin: '/admin',
};
