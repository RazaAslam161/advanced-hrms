import { differenceInMinutes, endOfMonth, format, startOfDay, startOfMonth } from 'date-fns';
import { AppError } from '../../common/utils/appError';
import type { JwtUserPayload } from '../../common/utils/jwt';
import { EmployeeModel } from '../employee/model';
import { AttendanceRecordModel, OvertimeRequestModel, ShiftModel } from './model';
import { getSocket } from '../../common/utils/socket';

const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const resolveDefaultShift = async () => {
  let shift = await ShiftModel.findOne({ isDefault: true });
  if (!shift) {
    shift = await ShiftModel.create({
      name: 'General Shift',
      code: 'GEN',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriodMinutes: 10,
      workDays: [1, 2, 3, 4, 5],
      overtimeThresholdHours: 8,
      isDefault: true,
    });
  }

  return shift;
};

export class AttendanceService {
  static async checkIn(userId: string, input: { lat: number; lng: number; timestamp: string }) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false });
    if (!employee || employee.isDeleted) {
      throw new AppError('Employee not found', 404);
    }

    const date = startOfDay(new Date(input.timestamp));
    const shift = await resolveDefaultShift();
    const existing = await AttendanceRecordModel.findOne({ employeeId: employee._id, date });
    if (existing?.checkIn) {
      throw new AppError('Already checked in for today', 409);
    }

    const now = new Date(input.timestamp);
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const shiftStart = parseTimeToMinutes(shift.startTime);
    const status = minutesNow > shiftStart + shift.gracePeriodMinutes ? 'late' : 'present';

    const record =
      existing ??
      (await AttendanceRecordModel.create({
        employeeId: employee._id,
        date,
        shiftId: shift._id,
      }));

    record.checkIn = now;
    record.checkInLocation = { lat: input.lat, lng: input.lng };
    record.status = status;
    await record.save();

    getSocket()?.emit('attendance:presence', { employeeId: employee.id, status: 'in', checkedInAt: record.checkIn });
    return record;
  }

  static async checkOut(userId: string, input: { lat: number; lng: number; timestamp: string }) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false });
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    const date = startOfDay(new Date(input.timestamp));
    const record = await AttendanceRecordModel.findOne({ employeeId: employee._id, date });
    if (!record?.checkIn) {
      throw new AppError('Check-in record not found for today', 404);
    }

    if (record.checkOut) {
      throw new AppError('Already checked out for today', 409);
    }

    record.checkOut = new Date(input.timestamp);
    record.checkOutLocation = { lat: input.lat, lng: input.lng };
    record.totalHours = Number((differenceInMinutes(record.checkOut, record.checkIn) / 60).toFixed(2));
    if (record.totalHours < 4) {
      record.status = 'half-day';
    }
    await record.save();

    getSocket()?.emit('attendance:presence', { employeeId: employee.id, status: 'out', checkedOutAt: record.checkOut });
    return record;
  }

  static async list(
    query: { employeeId?: string; startDate?: string; endDate?: string; department?: string; page?: string; limit?: string },
    requester?: JwtUserPayload,
  ) {
    let scopedEmployeeId = query.employeeId;
    if (requester?.role === 'employee') {
      const employee = await EmployeeModel.findOne({ userId: requester.userId, isDeleted: false }).select('_id');
      if (!employee) {
        throw new AppError('Employee profile not found', 404);
      }
      scopedEmployeeId = employee.id;
    }

    const filter = {
      ...(scopedEmployeeId ? { employeeId: scopedEmployeeId } : {}),
      ...(query.startDate || query.endDate
        ? {
            date: {
              ...(query.startDate ? { $gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { $lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const records = await AttendanceRecordModel.find(filter)
      .sort({ date: -1 })
      .populate('employeeId', 'employeeId firstName lastName department designation')
      .populate('shiftId', 'name code startTime endTime')
      .lean();

    const hydratedRecords = await EmployeeModel.populate(records, {
      path: 'employeeId.department',
      select: 'name code',
    });

    return hydratedRecords.filter((record) => {
      if (!query.department) {
        return true;
      }

      const employee = record.employeeId as unknown as { department?: { _id?: { toString(): string } | string } };
      const departmentId = typeof employee.department?._id === 'string' ? employee.department._id : employee.department?._id?.toString();
      return departmentId === query.department;
    });
  }

  static async dashboard(_requester?: JwtUserPayload) {
    if (_requester?.role === 'employee') {
      const employee = await EmployeeModel.findOne({ userId: _requester.userId, isDeleted: false }).select('_id employeeId firstName lastName');
      if (!employee) {
        throw new AppError('Employee profile not found', 404);
      }

      const today = startOfDay(new Date());
      const records = await AttendanceRecordModel.find({ date: today, employeeId: employee._id }).lean();
      const activeRecord = records.find((item) => item.checkIn && !item.checkOut);
      return {
        totalCheckedIn: activeRecord ? 1 : 0,
        totalCheckedOut: records.some((item) => item.checkOut) ? 1 : 0,
        live: records.map((item) => ({
          employee: employee,
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          status: item.checkOut ? 'out' : item.checkIn ? 'in' : 'unknown',
        })),
      };
    }

    const today = startOfDay(new Date());
    const records = await AttendanceRecordModel.find({ date: today }).populate('employeeId', 'employeeId firstName lastName').lean();
    const inOffice = records.filter((item) => item.checkIn && !item.checkOut);
    const outOffice = records.filter((item) => item.checkOut);
    return {
      totalCheckedIn: inOffice.length,
      totalCheckedOut: outOffice.length,
      live: records.map((item) => ({
        employee: item.employeeId,
        checkIn: item.checkIn,
        checkOut: item.checkOut,
        status: item.checkOut ? 'out' : item.checkIn ? 'in' : 'unknown',
      })),
    };
  }

  static async monthlyReport(employeeId: string, month: string, requester?: JwtUserPayload) {
    let scopedEmployeeId = employeeId;
    if (requester?.role === 'employee') {
      const employee = await EmployeeModel.findOne({ userId: requester.userId, isDeleted: false }).select('_id');
      if (!employee) {
        throw new AppError('Employee profile not found', 404);
      }
      scopedEmployeeId = employee.id;
    }

    const target = new Date(month);
    const records = await AttendanceRecordModel.find({
      employeeId: scopedEmployeeId,
      date: { $gte: startOfMonth(target), $lte: endOfMonth(target) },
    })
      .sort({ date: 1 })
      .lean();

    return records.map((item) => ({
      date: format(item.date, 'yyyy-MM-dd'),
      totalHours: item.totalHours,
      status: item.status,
      intensity: Math.min(Math.round((item.totalHours / 10) * 100), 100),
    }));
  }

  static async createShift(payload: Record<string, unknown>) {
    if (payload.isDefault) {
      await ShiftModel.updateMany({}, { isDefault: false });
    }
    return ShiftModel.create(payload);
  }

  static async listShifts() {
    return ShiftModel.find().sort({ isDefault: -1, name: 1 }).lean();
  }

  static async updateShift(id: string, payload: Record<string, unknown>) {
    if (payload.isDefault) {
      await ShiftModel.updateMany({}, { isDefault: false });
    }
    const shift = await ShiftModel.findByIdAndUpdate(id, payload, { new: true });
    if (!shift) {
      throw new AppError('Shift not found', 404);
    }
    return shift;
  }

  static async requestOvertime(userId: string, payload: { attendanceId: string; hours: number; reason: string }) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false }).select('_id');
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const attendance = await AttendanceRecordModel.findOne({ _id: payload.attendanceId, employeeId: employee._id });
    if (!attendance) {
      throw new AppError('Attendance record not found', 404);
    }

    return OvertimeRequestModel.create({
      employeeId: employee._id,
      attendanceId: payload.attendanceId,
      hours: payload.hours,
      reason: payload.reason,
    });
  }

  static async approveOvertime(requestId: string, approvedBy: string, status: 'approved' | 'rejected') {
    const request = await OvertimeRequestModel.findByIdAndUpdate(
      requestId,
      { approvedBy, status },
      { new: true },
    );
    if (!request) {
      throw new AppError('Overtime request not found', 404);
    }
    return request;
  }
}
