import type { Types } from 'mongoose';

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'intern';
export type WorkLocation = 'onsite' | 'remote' | 'hybrid';
export type EmployeeStatus = 'active' | 'probation' | 'inactive' | 'terminated';

export interface EmployeeSkill {
  skill: string;
  level: 1 | 2 | 3 | 4 | 5;
  verified: boolean;
}

export interface EmployeeDocument {
  type: string;
  url: string;
  key: string;
  expiresAt?: Date;
  uploadedAt: Date;
}

export interface SalaryProfile {
  basic: number;
  houseRent: number;
  medical: number;
  transport: number;
  currency: string;
  bonus: number;
}

export interface IEmployee {
  userId: Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  avatar?: string;
  department?: Types.ObjectId;
  designation: string;
  reportingTo?: Types.ObjectId;
  employmentType: EmploymentType;
  joiningDate: Date;
  probationEndDate?: Date;
  salary: SalaryProfile;
  bankDetails?: {
    bankName: string;
    accountNo: string;
    iban?: string;
  };
  emergencyContacts: Array<{ name: string; relation: string; phone: string }>;
  documents: EmployeeDocument[];
  skills: EmployeeSkill[];
  timezone: string;
  workLocation: WorkLocation;
  country: string;
  status: EmployeeStatus;
  isDeleted: boolean;
  deletedAt?: Date;
}
