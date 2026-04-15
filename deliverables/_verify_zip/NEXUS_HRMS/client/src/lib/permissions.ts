export const permissionGroups = {
  auth: ['auth.register'],
  employees: ['employees.read', 'employees.create', 'employees.update', 'employees.delete', 'employees.import', 'employees.upload', 'employees.timeline'],
  departments: ['departments.read', 'departments.create', 'departments.update', 'departments.delete', 'departments.orgchart'],
  attendance: ['attendance.read', 'attendance.checkin', 'attendance.checkout', 'attendance.manage', 'attendance.approve'],
  leave: ['leave.read', 'leave.apply', 'leave.approve', 'leave.manage'],
  payroll: ['payroll.read', 'payroll.process', 'payroll.approve', 'payroll.export'],
  performance: ['performance.read', 'performance.manage', 'performance.feedback', 'performance.review'],
  recruitment: ['recruitment.read', 'recruitment.manage', 'recruitment.public', 'recruitment.pipeline'],
  analytics: ['analytics.read', 'analytics.reports'],
  notifications: ['notifications.read', 'notifications.manage'],
  pulse: ['pulse.read', 'pulse.respond', 'pulse.manage'],
  gigs: ['gigs.read', 'gigs.create', 'gigs.manage'],
  announcements: ['announcements.read', 'announcements.publish', 'announcements.manage'],
  projects: ['projects.read', 'projects.create', 'projects.update', 'projects.assign', 'projects.status'],
} as const;

export const allPermissionOptions = Object.values(permissionGroups).flat();

export const hasPermission = (permissions: string[] | undefined, permission: string) => Boolean(permissions?.includes(permission));

export const hasAnyPermission = (permissions: string[] | undefined, requiredPermissions: string[]) =>
  requiredPermissions.some((permission) => permissions?.includes(permission));
