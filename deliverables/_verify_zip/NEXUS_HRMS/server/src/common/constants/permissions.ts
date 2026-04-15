export const modulePermissions = {
  auth: ['register', 'login', 'refresh', 'logout', 'mfa'],
  employees: ['read', 'create', 'update', 'delete', 'import', 'upload', 'timeline'],
  departments: ['read', 'create', 'update', 'delete', 'orgchart'],
  attendance: ['read', 'checkin', 'checkout', 'manage', 'approve'],
  leave: ['read', 'apply', 'approve', 'manage'],
  payroll: ['read', 'process', 'approve', 'export'],
  performance: ['read', 'manage', 'feedback', 'review'],
  recruitment: ['read', 'manage', 'public', 'pipeline'],
  analytics: ['read', 'reports'],
  notifications: ['read', 'manage'],
  pulse: ['read', 'respond', 'manage'],
  gigs: ['read', 'create', 'manage'],
  announcements: ['read', 'publish', 'manage'],
  projects: ['read', 'create', 'update', 'assign', 'status'],
} as const;

export const allPermissions = Object.entries(modulePermissions).flatMap(([moduleKey, actions]) =>
  actions.map((action) => `${moduleKey}.${action}`),
);
