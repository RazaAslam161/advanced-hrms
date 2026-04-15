import type {
  AccountActivity,
  AccountSession,
  Department,
  Employee,
  NotificationPreferences,
  User,
} from '../types';

const basePermissions = {
  superAdmin: [
    'auth.register',
    'employees.read',
    'employees.create',
    'employees.update',
    'employees.delete',
    'leave.read',
    'leave.apply',
    'leave.approve',
    'leave.manage',
    'payroll.read',
    'payroll.process',
    'payroll.approve',
    'payroll.export',
    'departments.read',
    'projects.read',
    'notifications.read',
    'announcements.read',
  ],
  admin: [
    'auth.register',
    'employees.read',
    'employees.create',
    'employees.update',
    'leave.read',
    'leave.approve',
    'leave.manage',
    'payroll.read',
    'payroll.process',
    'payroll.approve',
    'departments.read',
    'notifications.read',
    'announcements.read',
  ],
  manager: ['employees.read', 'leave.read', 'leave.approve', 'projects.read', 'notifications.read', 'announcements.read'],
  employee: ['leave.read', 'leave.apply', 'payroll.read', 'projects.read', 'notifications.read', 'announcements.read'],
  recruiter: ['recruitment.read', 'recruitment.manage', 'notifications.read', 'announcements.read'],
} as const;

export const testUsers: Record<User['role'], User> = {
  superAdmin: {
    id: 'user-super-admin',
    email: 'zia.aslam@metalabstech.com',
    role: 'superAdmin',
    permissions: [...basePermissions.superAdmin],
    firstName: 'Zia',
    lastName: 'Aslam',
    isActive: true,
  },
  admin: {
    id: 'user-admin',
    email: 'hr.portal@metalabstech.com',
    role: 'admin',
    permissions: [...basePermissions.admin],
    firstName: 'Ayesha',
    lastName: 'Khan',
    isActive: true,
  },
  manager: {
    id: 'user-manager',
    email: 'manager.portal@metalabstech.com',
    role: 'manager',
    permissions: [...basePermissions.manager],
    firstName: 'Usman',
    lastName: 'Malik',
    isActive: true,
  },
  employee: {
    id: 'user-employee',
    email: 'employee.portal@metalabstech.com',
    role: 'employee',
    permissions: [...basePermissions.employee],
    firstName: 'Aiman',
    lastName: 'Anwar',
    isActive: true,
  },
  recruiter: {
    id: 'user-recruiter',
    email: 'recruiter.portal@metalabstech.com',
    role: 'recruiter',
    permissions: [...basePermissions.recruiter],
    firstName: 'Sarah',
    lastName: 'Qureshi',
    isActive: true,
  },
};

export const testDepartments: Department[] = [
  {
    _id: 'department-engineering',
    name: 'Engineering',
    code: 'ENG',
    status: 'active',
  },
  {
    _id: 'department-hr',
    name: 'HR',
    code: 'HRS',
    status: 'active',
  },
];

export const makeEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  _id: overrides._id ?? `employee-${Math.random().toString(36).slice(2, 8)}`,
  employeeId: overrides.employeeId ?? 'MLT-2026-0001',
  firstName: overrides.firstName ?? 'Aiman',
  lastName: overrides.lastName ?? 'Anwar',
  email: overrides.email ?? 'employee.portal@metalabstech.com',
  displayName: overrides.displayName,
  avatar: overrides.avatar,
  phone: overrides.phone,
  role: overrides.role ?? 'employee',
  designation: overrides.designation ?? 'MERN Stack Engineer',
  status: overrides.status ?? 'active',
  employmentType: overrides.employmentType ?? 'full-time',
  joiningDate: overrides.joiningDate ?? '2026-01-10T09:00:00.000Z',
  timezone: overrides.timezone ?? 'Asia/Karachi',
  workLocation: overrides.workLocation ?? 'onsite',
  country: overrides.country ?? 'Pakistan',
  department: overrides.department ?? testDepartments[0],
  reportingTo: overrides.reportingTo,
  salary: overrides.salary ?? {
    basic: 180000,
    houseRent: 40000,
    medical: 10000,
    transport: 5000,
    currency: 'PKR',
    bonus: 0,
  },
  emergencyContacts: overrides.emergencyContacts ?? [],
  bankDetails: overrides.bankDetails,
});

export const defaultProfile = makeEmployee({
  _id: 'employee-profile',
  employeeId: 'MLT-2026-0007',
  firstName: 'Aiman',
  lastName: 'Anwar',
  email: 'employee.portal@metalabstech.com',
  role: 'employee',
});

export const defaultNotificationPreferences: NotificationPreferences = {
  preferences: {
    leave: { email: true, inApp: true },
    payroll: { email: true, inApp: true },
    review: { email: true, inApp: true },
    announcement: { email: true, inApp: true },
    system: { email: false, inApp: true },
  },
};

export const defaultSessions: AccountSession[] = [
  {
    id: 'session-1',
    userAgent: 'Chrome on Windows',
    ipAddress: '127.0.0.1',
    createdAt: '2026-04-16T08:00:00.000Z',
    expiresAt: '2026-04-23T08:00:00.000Z',
    revokedAt: null,
    active: true,
  },
];

export const defaultActivity: AccountActivity[] = [
  {
    _id: 'activity-1',
    module: 'settings',
    action: 'profile.update',
    entityType: 'Employee',
    entityId: 'employee-profile',
    createdAt: '2026-04-16T08:30:00.000Z',
  },
];

export const makeApiResponse = <T>(data: T, message = 'OK', pagination?: { page: number; limit: number; total: number; totalPages: number }) => ({
  success: true,
  message,
  data,
  ...(pagination ? { pagination } : {}),
});
