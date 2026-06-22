import { Schema, model } from 'mongoose';

const payrollRunSchema = new Schema(
  {
    month: { type: String, required: true, index: true },
    year: { type: Number, required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'processing', 'pendingApproval', 'approved', 'completed'],
      default: 'draft',
      index: true,
    },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true },
);

const payrollRecordSchema = new Schema(
  {
    payrollRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    currency: { type: String, default: 'PKR' },
    country: { type: String, default: 'Pakistan' },
    salary: {
      basic: Number,
      houseRent: Number,
      medical: Number,
      transport: Number,
      bonus: Number,
      deductions: Number,
      advances: Number,
      providentFund: Number,
      loanDeduction: Number,
      grossSalary: Number,
      tax: Number,
      netSalary: Number,
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'paid'],
      default: 'draft',
      index: true,
    },
  },
  { timestamps: true },
);

payrollRecordSchema.index({ payrollRunId: 1, employeeId: 1 }, { unique: true });

const loanAdvanceSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    type: { type: String, enum: ['loan', 'advance'], required: true, index: true },
    amount: { type: Number, required: true },
    monthlyDeduction: { type: Number, required: true },
    outstandingAmount: { type: Number, required: true },
    status: { type: String, enum: ['active', 'closed'], default: 'active', index: true },
  },
  { timestamps: true },
);

export const PayrollRunModel = model('PayrollRun', payrollRunSchema);
export const PayrollRecordModel = model('PayrollRecord', payrollRecordSchema);
export const LoanAdvanceModel = model('LoanAdvance', loanAdvanceSchema);
