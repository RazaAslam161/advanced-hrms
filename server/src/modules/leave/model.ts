import { Schema, model } from 'mongoose';

const leavePolicySchema = new Schema(
  {
    leaveType: {
      type: String,
      enum: ['casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity'],
      required: true,
      unique: true,
      index: true,
    },
    annualAllowance: { type: Number, required: true },
    carryForward: { type: Boolean, default: false },
    maxCarryForwardDays: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const leaveBalanceSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    year: { type: Number, required: true, index: true },
    balances: {
      casual: { type: Number, default: 10 },
      sick: { type: Number, default: 8 },
      annual: { type: Number, default: 14 },
      unpaid: { type: Number, default: 0 },
      maternity: { type: Number, default: 90 },
      paternity: { type: Number, default: 30 },
    },
    used: {
      casual: { type: Number, default: 0 },
      sick: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
      unpaid: { type: Number, default: 0 },
      maternity: { type: Number, default: 0 },
      paternity: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

leaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

const leaveRequestSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveType: {
      type: String,
      enum: ['casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity'],
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    days: { type: Number, required: true },
    halfDay: { type: Boolean, default: false },
    sandwichApplied: { type: Boolean, default: false },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pendingManager', 'pendingHR', 'approved', 'rejected'],
      default: 'pendingManager',
      index: true,
    },
    approvals: {
      managerApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      managerApprovedAt: { type: Date },
      hrApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      hrApprovedAt: { type: Date },
      rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      rejectedAt: { type: Date },
      rejectionReason: { type: String },
    },
  },
  { timestamps: true },
);

export const LeavePolicyModel = model('LeavePolicy', leavePolicySchema);
export const LeaveBalanceModel = model('LeaveBalance', leaveBalanceSchema);
export const LeaveRequestModel = model('LeaveRequest', leaveRequestSchema);
