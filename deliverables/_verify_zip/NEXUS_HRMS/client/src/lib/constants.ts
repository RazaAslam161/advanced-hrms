import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  ChartNoAxesCombined,
  CircleUserRound,
  ClipboardCheck,
  DollarSign,
  Gauge,
  Megaphone,
  FolderKanban,
  Sparkles,
  Settings2,
  Users,
} from 'lucide-react';
import type { User } from '../types';

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
  icon: LucideIcon;
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
  { label: 'Employees', slug: 'employees', icon: Users, roles: ['superAdmin', 'admin', 'manager'], permissions: ['employees.read'] },
  { label: 'Departments', slug: 'departments', icon: Building2, roles: ['superAdmin', 'admin', 'manager'], permissions: ['departments.read'] },
  { label: 'Attendance', slug: 'attendance', icon: ClipboardCheck, roles: ['superAdmin', 'admin', 'manager', 'employee'], permissions: ['attendance.read'] },
  { label: 'Leave', slug: 'leave', icon: CalendarRange, roles: ['superAdmin', 'admin', 'manager', 'employee'], permissions: ['leave.read'] },
  { label: 'Projects', slug: 'projects', icon: FolderKanban, roles: ['superAdmin', 'admin', 'manager', 'employee'], permissions: ['projects.read'] },
  { label: 'Payroll', slug: 'payroll', icon: DollarSign, roles: ['superAdmin', 'admin', 'manager', 'employee'], permissions: ['payroll.read'] },
  { label: 'Performance', slug: 'performance', icon: ChartNoAxesCombined, roles: ['superAdmin', 'admin', 'manager'], permissions: ['performance.read'] },
  { label: 'Recruitment', slug: 'recruitment', icon: BriefcaseBusiness, roles: ['superAdmin', 'admin', 'recruiter'], permissions: ['recruitment.read'] },
  { label: 'Analytics', slug: 'analytics', icon: ChartNoAxesCombined, roles: ['superAdmin', 'admin'], permissions: ['analytics.read'] },
  { label: 'Access', slug: 'access', icon: BadgeCheck, roles: ['superAdmin', 'admin'], permissions: ['auth.register'] },
  { label: 'Notifications', slug: 'notifications', icon: BellRing, roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], permissions: ['notifications.read'] },
  { label: 'Pulse', slug: 'pulse', icon: Sparkles, roles: ['superAdmin', 'admin', 'employee'], permissions: ['pulse.read'] },
  { label: 'Gigs', slug: 'gigs', icon: CircleUserRound, roles: ['superAdmin', 'admin', 'manager', 'employee'], permissions: ['gigs.read'] },
  { label: 'Announcements', slug: 'announcements', icon: Megaphone, roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], permissions: ['announcements.read'] },
  { label: 'Settings', slug: 'settings', icon: Settings2, roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'] },
];

export const getPortalConfig = (role?: UserRole | null) => (role ? portalConfigByRole[role] : null);

export const getRoleHomePath = (role?: UserRole | null) => getPortalConfig(role)?.basePath ?? '/login';

export const getPortalNavItems = (user: User | null) => {
  if (!user) {
    return [];
  }

  const permissionSet = new Set(user.permissions);
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

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4001/api/v1';
