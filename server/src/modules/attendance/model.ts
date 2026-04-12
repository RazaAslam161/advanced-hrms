import { Schema, model } from 'mongoose';

const shiftSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    gracePeriodMinutes: { type: Number, default: 10 },
    workDays: [{ type: Number, default: 1 }],
    overtimeThresholdHours: { type: Number, default: 8 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const attendanceRecordSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: Date, required: true, index: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    checkInLocation: { lat: Number, lng: Number },
    checkOutLocation: { lat: Number, lng: Number },
    totalHours: { type: Number, default: 0 },
    status: { type: String, enum: ['present', 'late', 'half-day', 'absent'], default: 'present', index: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift' },
  },
  { timestamps: true },
);

attendanceRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const overtimeRequestSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    attendanceId: { type: Schema.Types.ObjectId, ref: 'AttendanceRecord', required: true },
    hours: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const ShiftModel = model('Shift', shiftSchema);
export const AttendanceRecordModel = model('AttendanceRecord', attendanceRecordSchema);
export const OvertimeRequestModel = model('OvertimeRequest', overtimeRequestSchema);
