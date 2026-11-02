import type { Role } from '@/domain/roles';

/** The signed-in user, as every service sees them. */
export interface Actor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  departmentId: string | null;
}
