import type { Types } from 'mongoose';

export interface ILoanAdvance {
  employeeId: Types.ObjectId;
  type: 'loan' | 'advance';
  amount: number;
  monthlyDeduction: number;
  outstandingAmount: number;
  status: 'active' | 'closed';
}
