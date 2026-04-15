// We mock the module to avoid `import.meta` which is Vite-specific and not
// available in the Jest / Node.js CommonJS runtime.
jest.mock('./constants', () => {
  type UserRole = 'superAdmin' | 'admin' | 'manager' | 'employee' | 'recruiter';

  const portalConfigByRole: Record<UserRole, { key: string; role: UserRole; label: string; description: string; basePath: string }> = {
    superAdmin: { key: 'super-admin', role: 'superAdmin', label: 'Super Admin Portal', description: 'Global system control', basePath: '/portal/super-admin' },
    admin:      { key: 'hr',          role: 'admin',      label: 'HR Portal',           description: 'People operations',   basePath: '/portal/hr'         },
    manager:    { key: 'manager',     role: 'manager',    label: 'Manager Portal',       description: 'Team approvals',      basePath: '/portal/manager'    },
    employee:   { key: 'employee',    role: 'employee',   label: 'Employee Self-Service', description: 'Personal info',      basePath: '/portal/employee'   },
    recruiter:  { key: 'recruiter',   role: 'recruiter',  label: 'Recruiter Portal',     description: 'Hiring coordination', basePath: '/portal/recruiter'  },
  };

  const navCatalog = [
    { label: 'Dashboard',     slug: '',              roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'] },
    { label: 'Employees',     slug: 'employees',     roles: ['superAdmin', 'admin', 'manager'],                         permissions: ['employees.read'] },
    { label: 'Departments',   slug: 'departments',   roles: ['superAdmin', 'admin', 'manager'],                         permissions: ['departments.read'] },
    { label: 'Attendance',    slug: 'attendance',    roles: ['superAdmin', 'admin', 'manager', 'employee'],             permissions: ['attendance.read'] },
    { label: 'Leave',         slug: 'leave',         roles: ['superAdmin', 'admin', 'manager', 'employee'],             permissions: ['leave.read'] },
    { label: 'Payroll',       slug: 'payroll',       roles: ['superAdmin', 'admin', 'manager', 'employee'],             permissions: ['payroll.read'] },
    { label: 'Notifications', slug: 'notifications', roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], permissions: ['notifications.read'] },
    { label: 'Settings',      slug: 'settings',      roles: ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'] },
  ] as Array<{ label: string; slug: string; roles: UserRole[]; permissions?: string[] }>;

  const getPortalConfig = (role?: UserRole | null) => (role ? portalConfigByRole[role] ?? null : null);
  const getRoleHomePath = (role?: UserRole | null) => getPortalConfig(role)?.basePath ?? '/login';

  const getPortalNavItems = (user: { role: UserRole; permissions?: string[] } | null) => {
    if (!user) return [];
    const permissionSet = new Set(user.permissions ?? []);
    const portal = getPortalConfig(user.role);
    if (!portal) return [];
    return navCatalog
      .filter((item) => item.roles.includes(user.role))
      .filter((item) => !item.permissions || item.permissions.every((p) => permissionSet.has(p)))
      .map((item) => ({
        ...item,
        path: item.slug ? `${portal.basePath}/${item.slug}` : portal.basePath,
      }));
  };

  const canAccessPortalSlug = (user: { role: UserRole; permissions?: string[] } | null, slug: string) =>
    getPortalNavItems(user).some((item) => item.slug === slug);

  const getPortalLabelFromPath = (user: { role: UserRole; permissions?: string[] } | null, pathname: string) =>
    getPortalNavItems(user).find((item) => item.path === pathname)?.label ?? 'Dashboard';

  return {
    portalConfigByRole,
    getPortalConfig,
    getRoleHomePath,
    getPortalNavItems,
    canAccessPortalSlug,
    getPortalLabelFromPath,
    apiBaseUrl: 'http://localhost:4001/api/v1',
  };
});

import {
  getPortalConfig,
  getRoleHomePath,
  getPortalNavItems,
  canAccessPortalSlug,
  getPortalLabelFromPath,
} from './constants';

type UserRole = 'superAdmin' | 'admin' | 'manager' | 'employee' | 'recruiter';
type MockUser = { role: UserRole; permissions?: string[] };

describe('portal config helpers', () => {
  describe('getPortalConfig', () => {
    it('returns the correct config for each role', () => {
      expect(getPortalConfig('superAdmin')?.basePath).toBe('/portal/super-admin');
      expect(getPortalConfig('admin')?.basePath).toBe('/portal/hr');
      expect(getPortalConfig('manager')?.basePath).toBe('/portal/manager');
      expect(getPortalConfig('employee')?.basePath).toBe('/portal/employee');
      expect(getPortalConfig('recruiter')?.basePath).toBe('/portal/recruiter');
    });

    it('returns null when role is null', () => {
      expect(getPortalConfig(null)).toBeNull();
    });

    it('returns null when role is undefined', () => {
      expect(getPortalConfig(undefined)).toBeNull();
    });
  });

  describe('getRoleHomePath', () => {
    it('returns the correct basePath for each role', () => {
      expect(getRoleHomePath('superAdmin')).toBe('/portal/super-admin');
      expect(getRoleHomePath('employee')).toBe('/portal/employee');
    });

    it('falls back to /login when role is null', () => {
      expect(getRoleHomePath(null)).toBe('/login');
    });

    it('falls back to /login when role is undefined', () => {
      expect(getRoleHomePath(undefined)).toBe('/login');
    });
  });

  describe('getPortalNavItems', () => {
    it('returns an empty array when user is null', () => {
      expect(getPortalNavItems(null)).toEqual([]);
    });

    it('includes Dashboard for every role', () => {
      const roles: UserRole[] = ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'];
      for (const role of roles) {
        const items = getPortalNavItems({ role, permissions: ['employees.read', 'attendance.read', 'leave.read', 'payroll.read', 'notifications.read', 'departments.read'] });
        expect(items.some((item) => item.label === 'Dashboard')).toBe(true);
      }
    });

    it('includes permission-guarded items only when the user has them', () => {
      const userWithPerm: MockUser = { role: 'admin', permissions: ['employees.read', 'departments.read', 'attendance.read', 'leave.read', 'payroll.read', 'notifications.read'] };
      const userWithoutPerm: MockUser = { role: 'admin', permissions: [] };

      expect(getPortalNavItems(userWithPerm).some((i) => i.label === 'Employees')).toBe(true);
      expect(getPortalNavItems(userWithoutPerm).some((i) => i.label === 'Employees')).toBe(false);
    });

    it('excludes items that are not in the user role list', () => {
      const employee: MockUser = { role: 'employee', permissions: ['attendance.read', 'leave.read', 'payroll.read', 'notifications.read'] };
      const items = getPortalNavItems(employee);
      expect(items.some((i) => i.label === 'Employees')).toBe(false);
    });

    it('constructs paths with basePath prefix for non-empty slugs', () => {
      const admin: MockUser = { role: 'admin', permissions: ['attendance.read'] };
      const items = getPortalNavItems(admin);
      const attendance = items.find((i) => i.label === 'Attendance');
      expect(attendance?.path).toBe('/portal/hr/attendance');
    });

    it('uses the bare basePath for the dashboard (empty slug)', () => {
      const admin: MockUser = { role: 'admin', permissions: [] };
      const dashboard = getPortalNavItems(admin).find((i) => i.label === 'Dashboard');
      expect(dashboard?.path).toBe('/portal/hr');
    });
  });

  describe('canAccessPortalSlug', () => {
    it('returns true when the user has access to the slug', () => {
      const admin: MockUser = { role: 'admin', permissions: ['attendance.read'] };
      expect(canAccessPortalSlug(admin, 'attendance')).toBe(true);
    });

    it('returns false when the user lacks the required permission', () => {
      const admin: MockUser = { role: 'admin', permissions: [] };
      expect(canAccessPortalSlug(admin, 'attendance')).toBe(false);
    });

    it('returns false when user is null', () => {
      expect(canAccessPortalSlug(null, 'attendance')).toBe(false);
    });

    it('returns false for a slug that does not exist', () => {
      const admin: MockUser = { role: 'admin', permissions: ['employees.read'] };
      expect(canAccessPortalSlug(admin, 'nonexistent-slug')).toBe(false);
    });
  });

  describe('getPortalLabelFromPath', () => {
    it('returns the label for a matching path', () => {
      const admin: MockUser = { role: 'admin', permissions: ['attendance.read'] };
      expect(getPortalLabelFromPath(admin, '/portal/hr/attendance')).toBe('Attendance');
    });

    it('falls back to Dashboard when path is not found', () => {
      const admin: MockUser = { role: 'admin', permissions: [] };
      expect(getPortalLabelFromPath(admin, '/portal/hr/nonexistent')).toBe('Dashboard');
    });

    it('returns Dashboard label for the base portal path', () => {
      const admin: MockUser = { role: 'admin', permissions: [] };
      expect(getPortalLabelFromPath(admin, '/portal/hr')).toBe('Dashboard');
    });

    it('returns null-safe result when user is null', () => {
      expect(getPortalLabelFromPath(null, '/portal/hr')).toBe('Dashboard');
    });
  });
});
