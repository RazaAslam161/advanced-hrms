import type { Types } from 'mongoose';

export type LeaveType = 'casual' | 'sick' | 'annual' | 'unpaid' | 'maternity' | 'paternity';

export interface ILeavePolicy {
  leaveType: LeaveType;
  annualAllowance: number;
  carryForward: boolean;
  maxCarryForwardDays: number;
}

export interface ILeaveBalance {
  employeeId: Types.ObjectId;
  year: number;
  balances: Record<LeaveType, number>;
  used: Record<LeaveType, number>;
}
