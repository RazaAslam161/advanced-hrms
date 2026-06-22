import { endOfDay, startOfDay, subMonths } from 'date-fns';
import { createWorkbookBuffer } from '../../common/utils/excel';
import { createDocumentBuffer, renderBrandedHeader } from '../../common/utils/pdf';
import { EmployeeModel } from '../employee/model';
import { AttendanceRecordModel } from '../attendance/model';
import { LeaveRequestModel } from '../leave/model';
import { PayrollRecordModel } from '../payroll/model';
import { ApplicationModel } from '../recruitment/model';
import { PerformanceReviewModel } from '../performance/model';

const constrainedParser = (query: string) => {
  const normalized = query.toLowerCase();
  if (normalized.includes('leave')) {
    return { module: 'leave', format: 'excel', filters: {} };
  }
  if (normalized.includes('payroll')) {
    return { module: 'payroll', format: 'excel', filters: {} };
  }
  if (normalized.includes('attendance')) {
    return { module: 'attendance', format: 'excel', filters: {} };
  }
  return { module: 'employees', format: 'excel', filters: {} };
};

export class AnalyticsService {
  static async dashboard() {
    const [employees, newHires, attendance, leaves, payroll] = await Promise.all([
      EmployeeModel.countDocuments({ isDeleted: false }),
      EmployeeModel.countDocuments({ createdAt: { $gte: subMonths(new Date(), 1) }, isDeleted: false }),
      AttendanceRecordModel.find().lean(),
      LeaveRequestModel.find({ status: 'approved' }).lean(),
      PayrollRecordModel.find().lean(),
    ]);

    const activeEmployees = await EmployeeModel.countDocuments({ status: 'active', isDeleted: false });
    const terminated = await EmployeeModel.countDocuments({ status: 'terminated' });
    const totalHours = attendance.reduce((sum, item) => sum + item.totalHours, 0);
    const payrollCost = payroll.reduce((sum, item) => sum + (item.salary?.netSalary ?? 0), 0);
    const totalLeaveDays = leaves.reduce((sum, item) => sum + item.days, 0);

    return {
      totalEmployees: employees,
      newHires,
      attritionRate: employees === 0 ? 0 : Number(((terminated / employees) * 100).toFixed(2)),
      averageAttendance: attendance.length === 0 ? 0 : Number((totalHours / attendance.length).toFixed(2)),
      leaveUtilization: activeEmployees === 0 ? 0 : Number((totalLeaveDays / activeEmployees).toFixed(2)),
      payrollCost,
    };
  }

  static async charts() {
    const [departments, applications, attendance, leaves, payroll] = await Promise.all([
      EmployeeModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$department', value: { $sum: 1 } } },
        { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
        {
          $project: {
            value: 1,
            name: { $ifNull: [{ $arrayElemAt: ['$department.name', 0] }, 'Unassigned'] },
          },
        },
        { $sort: { value: -1 } },
      ]),
      ApplicationModel.aggregate([{ $group: { _id: { $substr: ['$createdAt', 0, 7] }, value: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      AttendanceRecordModel.find().select('date totalHours status').lean(),
      LeaveRequestModel.aggregate([{ $group: { _id: '$leaveType', value: { $sum: '$days' } } }]),
      PayrollRecordModel.find().select('salary.netSalary').lean(),
    ]);

    return {
      departmentDistribution: departments.map((item) => ({ name: item.name ?? 'Unassigned', value: item.value })),
      monthlyHiringTrend: applications.map((item) => ({ name: item._id, value: item.value })),
      attendanceHeatmap: attendance.map((item) => ({
        date: item.date,
        value: item.totalHours,
        status: item.status,
      })),
      leaveTypeBreakdown: leaves.map((item) => ({ name: item._id, value: item.value })),
      salaryDistribution: payroll.map((item, index) => ({ name: `Employee ${index + 1}`, value: item.salary?.netSalary ?? 0 })),
    };
  }

  static async liveActivity() {
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    const [totalActive, attendanceToday, onLeave] = await Promise.all([
      EmployeeModel.countDocuments({ isDeleted: false, status: { $in: ['active', 'probation'] } }),
      AttendanceRecordModel.find({ date: { $gte: start, $lte: end } })
        .select('checkIn checkOut status')
        .lean(),
      LeaveRequestModel.countDocuments({ status: 'approved', startDate: { $lte: end }, endDate: { $gte: start } }),
    ]);

    const present = attendanceToday.filter((record) => Boolean(record.checkIn)).length;
    const stillWorking = attendanceToday.filter((record) => record.checkIn && !record.checkOut).length;
    const signedOut = attendanceToday.filter((record) => record.checkIn && record.checkOut).length;
    const late = attendanceToday.filter((record) => record.status === 'late').length;
    const notCheckedIn = Math.max(totalActive - present - onLeave, 0);
    const attendanceRate = totalActive === 0 ? 0 : Math.round((present / totalActive) * 100);

    return {
      serverTime: now.toISOString(),
      totalActive,
      present,
      stillWorking,
      signedOut,
      late,
      onLeave,
      notCheckedIn,
      attendanceRate,
    };
  }

  static async liveActivityDetail(category: string) {
    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    type PopulatedEmployee = {
      _id: { toString(): string };
      employeeId?: string;
      firstName?: string;
      lastName?: string;
      designation?: string;
    };

    const toEntry = (employee: PopulatedEmployee, meta?: string) => ({
      id: employee._id.toString(),
      name: `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || 'Unknown',
      code: employee.employeeId ?? '',
      meta: meta ?? employee.designation ?? '',
    });

    const formatTime = (value?: Date | null) =>
      value
        ? new Date(value).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Karachi',
          })
        : '';

    if (category === 'onLeave') {
      const leaves = await LeaveRequestModel.find({ status: 'approved', startDate: { $lte: end }, endDate: { $gte: start } })
        .populate('employeeId', 'employeeId firstName lastName designation')
        .lean();
      return leaves
        .filter((leave) => leave.employeeId)
        .map((leave) => toEntry(leave.employeeId as unknown as PopulatedEmployee, leave.leaveType));
    }

    if (category === 'notCheckedIn') {
      const [attendance, leaves, employees] = await Promise.all([
        AttendanceRecordModel.find({ date: { $gte: start, $lte: end }, checkIn: { $exists: true } })
          .select('employeeId')
          .lean(),
        LeaveRequestModel.find({ status: 'approved', startDate: { $lte: end }, endDate: { $gte: start } })
          .select('employeeId')
          .lean(),
        EmployeeModel.find({ isDeleted: false, status: { $in: ['active', 'probation'] } })
          .select('employeeId firstName lastName designation')
          .lean(),
      ]);
      const presentIds = new Set(attendance.map((record) => String(record.employeeId)));
      const leaveIds = new Set(leaves.map((leave) => String(leave.employeeId)));
      return employees
        .filter((employee) => !presentIds.has(String(employee._id)) && !leaveIds.has(String(employee._id)))
        .map((employee) => toEntry(employee as unknown as PopulatedEmployee));
    }

    const attendance = await AttendanceRecordModel.find({ date: { $gte: start, $lte: end } })
      .populate('employeeId', 'employeeId firstName lastName designation')
      .lean();

    const matches = attendance.filter((record) => {
      if (!record.employeeId) {
        return false;
      }
      if (category === 'present') return Boolean(record.checkIn);
      if (category === 'stillWorking') return Boolean(record.checkIn) && !record.checkOut;
      if (category === 'signedOut') return Boolean(record.checkIn) && Boolean(record.checkOut);
      if (category === 'late') return record.status === 'late';
      return false;
    });

    return matches.map((record) => {
      const time = category === 'signedOut' ? record.checkOut : record.checkIn;
      const meta =
        category === 'late' && record.lateMinutes
          ? `${record.lateMinutes} min late`
          : category === 'signedOut' && record.overtimeHours
            ? `${record.overtimeHours} hr overtime`
            : formatTime(time);
      return toEntry(record.employeeId as unknown as PopulatedEmployee, meta);
    });
  }

  static async buildReport(payload: { module: string; format: 'pdf' | 'excel'; startDate?: string; endDate?: string }) {
    const dataset = await this.resolveModuleDataset(payload.module, payload.startDate, payload.endDate);
    if (payload.format === 'pdf') {
      return createDocumentBuffer((doc) => {
        renderBrandedHeader(doc, `${payload.module.toUpperCase()} Report`);
        dataset.forEach((record) => doc.text(JSON.stringify(record)));
      });
    }

    return createWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Report');
      if (dataset.length === 0) {
        sheet.addRow(['No data']);
        return;
      }
      const columns = Object.keys(dataset[0]);
      sheet.addRow(columns);
      dataset.forEach((record) => {
        const typedRecord = record as Record<string, unknown>;
        sheet.addRow(columns.map((column) => JSON.stringify(typedRecord[column] ?? '')));
      });
    });
  }

  private static async resolveModuleDataset(module: string, startDate?: string, endDate?: string) {
    const dateFilter =
      startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {}),
            },
          }
        : {};

    switch (module) {
      case 'attendance':
        return AttendanceRecordModel.find(dateFilter).lean();
      case 'leave':
        return LeaveRequestModel.find(dateFilter).lean();
      case 'payroll':
        return PayrollRecordModel.find(dateFilter).lean();
      case 'recruitment':
        return ApplicationModel.find(dateFilter).lean();
      case 'performance':
        return PerformanceReviewModel.find(dateFilter).lean();
      default:
        return EmployeeModel.find({ ...dateFilter, isDeleted: false }).lean();
    }
  }

  static async naturalLanguageQuery(query: string) {
    return constrainedParser(query);
  }
}
