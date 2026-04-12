import { subMonths } from 'date-fns';
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
      EmployeeModel.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$department', value: { $sum: 1 } } }]),
      ApplicationModel.aggregate([{ $group: { _id: { $substr: ['$createdAt', 0, 7] }, value: { $sum: 1 } } }]),
      AttendanceRecordModel.find().select('date totalHours status').lean(),
      LeaveRequestModel.aggregate([{ $group: { _id: '$leaveType', value: { $sum: '$days' } } }]),
      PayrollRecordModel.find().select('salary.netSalary').lean(),
    ]);

    return {
      departmentDistribution: departments.map((item) => ({ name: item._id?.toString() ?? 'Unassigned', value: item.value })),
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
