import {
  Activity01Icon,
  Analytics01Icon,
  Book02Icon,
  Building03Icon,
  Calendar03Icon,
  Certificate01Icon,
  DashboardSquare01Icon,
  DocumentValidationIcon,
  LeftToRightListBulletIcon,
  Mortarboard02Icon,
  StudentCardIcon,
  TeacherIcon,
  UserCircleIcon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@/components/ui/icon';
import type { Role } from '@/domain/roles';

export interface NavItem {
  href: string;
  label: string;
  icon: IconSvgElement;
}

export const NAV: Record<Role, NavItem[]> = {
  student: [
    { href: '/student', label: 'Dashboard', icon: DashboardSquare01Icon },
    { href: '/student/courses', label: 'Course registration', icon: Book02Icon },
    { href: '/student/results', label: 'Results', icon: Certificate01Icon },
    { href: '/student/profile', label: 'Profile', icon: UserCircleIcon },
  ],
  lecturer: [{ href: '/lecturer', label: 'My courses', icon: TeacherIcon }],
  department_admin: [
    { href: '/department', label: 'Dashboard', icon: DashboardSquare01Icon },
    { href: '/department/results', label: 'Result approvals', icon: DocumentValidationIcon },
    { href: '/department/students', label: 'Students', icon: StudentCardIcon },
    { href: '/department/lecturers', label: 'Lecturers', icon: TeacherIcon },
    { href: '/department/courses', label: 'Courses', icon: Book02Icon },
    { href: '/department/programs', label: 'Programs', icon: Mortarboard02Icon },
    { href: '/department/registrations', label: 'Registrations', icon: LeftToRightListBulletIcon },
    { href: '/department/reports', label: 'Reports', icon: Analytics01Icon },
  ],
  super_admin: [
    { href: '/admin', label: 'Dashboard', icon: DashboardSquare01Icon },
    { href: '/admin/structure', label: 'Faculties & departments', icon: Building03Icon },
    { href: '/admin/sessions', label: 'Sessions & semesters', icon: Calendar03Icon },
    { href: '/admin/users', label: 'Users', icon: UserMultiple02Icon },
    { href: '/admin/courses', label: 'Courses', icon: Book02Icon },
    { href: '/admin/results', label: 'Result approvals', icon: DocumentValidationIcon },
    { href: '/admin/registrations', label: 'Registrations', icon: LeftToRightListBulletIcon },
    { href: '/admin/reports', label: 'Reports', icon: Analytics01Icon },
    { href: '/admin/audit', label: 'Activity log', icon: Activity01Icon },
  ],
};
