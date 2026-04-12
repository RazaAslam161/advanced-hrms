import type { Types } from 'mongoose';

export interface IShift {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  workDays: number[];
  overtimeThresholdHours: number;
  isDefault: boolean;
}

export interface IAttendanceRecord {
  employeeId: Types.ObjectId;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  checkInLocation?: { lat: number; lng: number };
  checkOutLocation?: { lat: number; lng: number };
  totalHours: number;
  status: 'present' | 'late' | 'half-day' | 'absent';
  shiftId?: Types.ObjectId;
}
