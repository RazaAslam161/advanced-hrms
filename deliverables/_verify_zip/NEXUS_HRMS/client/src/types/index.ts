export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  errors?: Array<{ field?: string; message: string }>;
}

export interface User {
  id: string;
  email: string;
  role: 'superAdmin' | 'admin' | 'manager' | 'employee' | 'recruiter';
  permissions: string[];
  firstName: string;
  lastName: string;
  isActive?: boolean;
  lastLogin?: string | null;
  mfaEnabled?: boolean;
  mustChangePassword?: boolean;
}

export interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName?: string;
  avatar?: string;
  phone?: string;
  role?: 'superAdmin' | 'admin' | 'manager' | 'employee' | 'recruiter';
  designation: string;
  status: string;
  employmentType: string;
  joiningDate?: string;
  timezone?: string;
  workLocation: string;
  country: string;
  department?: { _id: string; name: string; code: string };
  reportingTo?: { _id: string; employeeId: string; firstName: string; lastName: string; designation: string };
  salary: {
    basic: number;
    houseRent: number;
    medical: number;
    transport: number;
    currency: string;
    bonus: number;
  };
  emergencyContacts?: Array<{ name: string; relation: string; phone: string }>;
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    iban?: string;
  };
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  status: string;
  description?: string;
  head?: { _id: string; firstName: string; lastName: string };
  parentDepartment?: { _id: string; name: string; code: string };
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  helper: string;
}

export interface ProjectMember {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation?: string;
}

export interface ProjectUpdate {
  _id: string;
  employeeId: ProjectMember;
  summary: string;
  blockers?: string;
  progress: number;
  projectStatus: 'planning' | 'active' | 'onHold' | 'completed';
  submittedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  code: string;
  clientName: string;
  description: string;
  status: 'planning' | 'active' | 'onHold' | 'completed';
  health: 'green' | 'amber' | 'red';
  progress: number;
  startDate: string;
  endDate?: string;
  department?: { _id: string; name: string; code: string };
  managerId?: ProjectMember;
  memberIds?: ProjectMember[];
  updates?: ProjectUpdate[];
}

export interface NotificationPreferences {
  preferences: {
    leave: { email: boolean; inApp: boolean };
    payroll: { email: boolean; inApp: boolean };
    review: { email: boolean; inApp: boolean };
    announcement: { email: boolean; inApp: boolean };
    system: { email: boolean; inApp: boolean };
  };
}

export interface AccountSession {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt?: string;
  expiresAt: string;
  revokedAt?: string | null;
  active: boolean;
}

export interface AccountActivity {
  _id: string;
  module: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
