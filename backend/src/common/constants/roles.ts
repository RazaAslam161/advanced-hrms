export const roles = ['superAdmin', 'admin', 'manager', 'employee', 'recruiter'] as const;

export type Role = (typeof roles)[number];

export const roleHierarchy: Record<Role, number> = {
  superAdmin: 5,
  admin: 4,
  manager: 3,
  recruiter: 2,
  employee: 1,
};
