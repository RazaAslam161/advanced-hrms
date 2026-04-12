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
  mfaEnabled?: boolean;
  mustChangePassword?: boolean;
}

export interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  status: string;
  employmentType: string;
  workLocation: string;
  country: string;
  salary: {
    basic: number;
    houseRent: number;
    medical: number;
    transport: number;
    currency: string;
    bonus: number;
  };
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  status: string;
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
