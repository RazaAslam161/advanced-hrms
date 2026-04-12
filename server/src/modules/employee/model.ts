import { Schema, model } from 'mongoose';

const employeeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    employeeId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, index: true },
    avatar: { type: String },
    department: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    designation: { type: String, required: true },
    reportingTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      required: true,
      index: true,
    },
    joiningDate: { type: Date, required: true, index: true },
    probationEndDate: { type: Date },
    salary: {
      basic: { type: Number, default: 0 },
      houseRent: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      currency: { type: String, default: 'PKR' },
      bonus: { type: Number, default: 0 },
    },
    bankDetails: {
      bankName: { type: String },
      accountNo: { type: String },
      iban: { type: String },
    },
    emergencyContacts: [{ name: String, relation: String, phone: String }],
    documents: [{ type: { type: String }, url: String, key: String, expiresAt: Date, uploadedAt: Date }],
    skills: [{ skill: String, level: Number, verified: Boolean }],
    timezone: { type: String, default: 'Asia/Karachi' },
    workLocation: { type: String, enum: ['onsite', 'remote', 'hybrid'], default: 'onsite', index: true },
    country: { type: String, default: 'Pakistan' },
    status: { type: String, enum: ['active', 'probation', 'inactive', 'terminated'], default: 'active', index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

employeeSchema.index({ firstName: 1, lastName: 1, department: 1, status: 1 });

const employeeActivitySchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    summary: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

export const EmployeeModel = model('Employee', employeeSchema);
export const EmployeeActivityModel = model('EmployeeActivity', employeeActivitySchema);
