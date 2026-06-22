import type { ComponentType } from 'react';
import {
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  ChartNoAxesCombined,
  CircleUserRound,
  ClipboardCheck,
  Gauge,
  Megaphone,
  FolderKanban,
  Sparkles,
  Settings2,
  Users,
} from 'lucide-react';
import { RupeeIcon } from '../components/RupeeIcon';
import type { User } from '../types';
import { getClientEnv } from './env';

export type UserRole = User['role'];

export interface PortalConfig {
  key: 'super-admin' | 'hr' | 'manager' | 'employee' | 'recruiter';
  role: UserRole;
  label: string;
  description: string;
  basePath: string;
}

export interface NavItem {
  label: string;
  slug: string;
  icon: ComponentType<{ className?: string }>;
  roles: UserRole[];
  permissions?: string[];
}

export const portalConfigByRole: Record<UserRole, PortalConfig> = {
  superAdmin: {
    key: 'super-admin',
    role: 'superAdmin',
    label: 'Super Admin Portal',
    description: 'Global system control, platform governance, and cross-office oversight.',
    basePath: '/portal/super-admin',
  },
  admin: {
    key: 'hr',
    role: 'admin',
    label: 'HR Portal',
    description: 'People operations, payroll approvals, recruitment, and policy execution.',
    basePath: '/portal/hr',
  },
  manager: {
    key: 'manager',
    role: 'manager',
    label: 'Manager Portal',
    description: 'Team approvals, attendance visibility, and performance follow-through.',
    basePath: '/portal/manager',
  },
  employee: {
    key: 'employee',
    role: 'employee',
    label: 'Employee Self-Service',
    description: 'Personal attendance, leave, payslips, announcements, and recognition.',
    basePath: '/portal/employee',
  },
  recruiter: {
    key: 'recruiter',
    role: 'recruiter',
    label: 'Recruiter Portal',
    description: 'Careers publishing, ATS pipeline movement, and hiring coordination.',
    basePath: '/portal/recruiter',
  },
};

const navCatalog: NavItem[] = [
  { label: 'Dashboard', slug: '', icon: Gauge, roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'] },
  // Super Admin + HR see the full directory; managers see their team via a scoped label.
  { label: 'Employees', slug: 'employees', icon: Users, roles: ['superAdmin', 'admin'], permissions: ['employees.read'] },
  { label: 'My Team', slug: 'employees', icon: Users, roles: ['manager'], permissions: ['employees.read'] },
  { label: 'Departments', slug: 'departments', icon: Building2, roles: ['superAdmin', 'admin'], permissions: ['departments.read'] },
  { label: 'Attendance', slug: 'attendance', icon: ClipboardCheck, roles: ['superAdmin', 'admin', 'manager', 'employee'], permissions: ['attendance.read'] },
  { label: 'Leave', slug: 'leave', icon: CalendarRange, roles: ['superAdmin', 'admin', 'manager', 'employee'], permissions: ['leave.read'] },
  { label: 'Projects', slug: 'projects', icon: FolderKanban, roles: ['superAdmin', 'manager', 'employee'], permissions: ['projects.read'] },
  { label: 'Payroll', slug: 'payroll', icon: RupeeIcon, roles: ['superAdmin', 'admin', 'employee'], permissions: ['payroll.read'] },
  { label: 'Performance', slug: 'performance', icon: ChartNoAxesCombined, roles: ['superAdmin', 'admin', 'manager'], permissions: ['performance.read'] },
  { label: 'Recruitment', slug: 'recruitment', icon: BriefcaseBusiness, roles: ['superAdmin', 'admin', 'recruiter'], permissions: ['recruitment.read'] },
  { label: 'Analytics', slug: 'analytics', icon: ChartNoAxesCombined, roles: ['superAdmin', 'admin'], permissions: ['analytics.read'] },
  { label: 'Access', slug: 'access', icon: BadgeCheck, roles: ['superAdmin'], permissions: ['auth.register'] },
  { label: 'Pulse', slug: 'pulse', icon: Sparkles, roles: ['superAdmin', 'employee'], permissions: ['pulse.read'] },
  { label: 'Gigs', slug: 'gigs', icon: CircleUserRound, roles: ['superAdmin', 'manager', 'employee'], permissions: ['gigs.read'] },
  { label: 'Announcements', slug: 'announcements', icon: Megaphone, roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], permissions: ['announcements.read'] },
  { label: 'Notifications', slug: 'notifications', icon: BellRing, roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], permissions: ['notifications.read'] },
  { label: 'Settings', slug: 'settings', icon: Settings2, roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'] },
];

export const getPortalConfig = (role?: UserRole | null) => (role ? portalConfigByRole[role] : null);

export const getRoleHomePath = (role?: UserRole | null) => getPortalConfig(role)?.basePath ?? '/login';

export const getPortalNavItems = (user: User | null) => {
  if (!user) {
    return [];
  }

  const permissionSet = new Set(user.permissions ?? []);
  const portal = getPortalConfig(user.role);
  if (!portal) {
    return [];
  }

  return navCatalog
    .filter((item) => item.roles.includes(user.role))
    .filter((item) => !item.permissions || item.permissions.every((permission) => permissionSet.has(permission)))
    .map((item) => ({
      ...item,
      path: item.slug ? `${portal.basePath}/${item.slug}` : portal.basePath,
    }));
};

export const canAccessPortalSlug = (user: User | null, slug: string) =>
  getPortalNavItems(user).some((item) => item.slug === slug);

export const getPortalLabelFromPath = (user: User | null, pathname: string) =>
  getPortalNavItems(user).find((item) => item.path === pathname)?.label ?? 'Dashboard';

export const getApiBaseUrl = () =>
  getClientEnv('VITE_API_URL', 'http://localhost:4001/api/v1');
