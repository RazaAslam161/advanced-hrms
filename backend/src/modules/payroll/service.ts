import { createDocumentBuffer, renderBrandedHeader } from '../../common/utils/pdf';
import { createWorkbookBuffer } from '../../common/utils/excel';
import { computePayroll } from '../../common/utils/tax';
import { AppError } from '../../common/utils/appError';
import { logger } from '../../common/utils/logger';
import type { JwtUserPayload } from '../../common/utils/jwt';
import { emailQueue, payrollQueue } from '../../jobs/queues';
import { EmployeeModel } from '../employee/model';
import { LoanAdvanceModel, PayrollRecordModel, PayrollRunModel } from './model';
import { NotificationModel, NotificationPreferenceModel } from '../notification/model';
import { UserModel } from '../auth/model';

export const processPayrollRun = async (payrollRunId: string): Promise<void> => {
  const run = await PayrollRunModel.findById(payrollRunId);
  if (!run) {
    throw new AppError('Payroll run not found', 404);
  }

  run.status = 'processing';
  await run.save();

  const employees = await EmployeeModel.find({ isDeleted: false, status: { $in: ['active', 'probation'] } }).lean();

  for (const employee of employees) {
    const loanEntries = await LoanAdvanceModel.find({ employeeId: employee._id, status: 'active' });
    const loanDeduction = loanEntries.reduce((total, item) => total + item.monthlyDeduction, 0);
    const country = employee.country === 'UAE' ? 'UAE' : 'Pakistan';
    const salary = employee.salary ?? {
      basic: 0,
      houseRent: 0,
      medical: 0,
      transport: 0,
      bonus: 0,
      currency: 'PKR',
    };
    const computed = computePayroll(
      {
        basic: salary.basic,
        houseRent: salary.houseRent,
        medical: salary.medical,
        transport: salary.transport,
        bonus: salary.bonus,
        deductions: 0,
        advances: 0,
        providentFund: country === 'Pakistan' ? Math.round(salary.basic * 0.08) : 0,
        loanDeduction,
      },
      country,
    );

    await PayrollRecordModel.findOneAndUpdate(
      { payrollRunId: run._id, employeeId: employee._id },
      {
        payrollRunId: run._id,
        employeeId: employee._id,
        month: run.month,
        year: run.year,
        currency: salary.currency,
        country,
        salary: computed,
      },
      { upsert: true, new: true },
    );
  }

  run.status = 'pendingApproval';
  await run.save();
};

export const processPayslipNotification = async (notificationId: string): Promise<void> => {
  const notification = await NotificationModel.findById(notificationId).lean();
  if (!notification?.userId || !notification.channels.includes('email')) {
    return;
  }

  const [user, preferences] = await Promise.all([
    UserModel.findById(notification.userId).select('email').lean(),
    NotificationPreferenceModel.findOne({ userId: notification.userId }).lean(),
  ]);

  if (!user?.email) {
    return;
  }

  const payrollEmailEnabled =
    (preferences?.preferences as { payroll?: { email?: boolean } } | undefined)?.payroll?.email ?? true;

  if (!payrollEmailEnabled) {
    return;
  }

  const { NotificationService } = await import('../notification/service');
  await NotificationService.sendEmailNotification(user.email, notification.title, notification.message);
};

export class PayrollService {
  static async listRuns() {
    return PayrollRunModel.find().sort({ year: -1, month: -1 }).lean();
  }

  static async listRecords(query: { payrollRunId?: string; employeeId?: string }, requester?: JwtUserPayload) {
    let scopedEmployeeId = query.employeeId;
    if (requester && requester.role !== 'superAdmin' && requester.role !== 'admin') {
      const employee = await EmployeeModel.findOne({ userId: requester.userId, isDeleted: false }).select('_id');
      if (!employee) {
        throw new AppError('Employee profile not found', 404);
      }
      scopedEmployeeId = employee.id;
    }

    return PayrollRecordModel.find({
      ...(query.payrollRunId ? { payrollRunId: query.payrollRunId } : {}),
      ...(scopedEmployeeId ? { employeeId: scopedEmployeeId } : {}),
    })
      .populate('employeeId', 'employeeId firstName lastName department designation bankDetails country')
      .populate('payrollRunId', 'month year status')
      .lean();
  }

  static async process(payload: { month: string; year: number; notes?: string }, actorId: string) {
    const run = await PayrollRunModel.create({
      ...payload,
      processedBy: actorId,
      status: 'draft',
    });

    await payrollQueue.add('process-payroll', { payrollRunId: run.id }, async ({ payrollRunId }) => {
      await processPayrollRun(payrollRunId);
    });

    return PayrollRunModel.findById(run.id);
  }

  static async approve(runId: string, actorId: string) {
    const run = await PayrollRunModel.findById(runId);
    if (!run) {
      throw new AppError('Payroll run not found', 404);
    }
    if (run.status !== 'pendingApproval') {
      throw new AppError('Payroll run is not ready for approval', 400);
    }

    run.status = 'approved';
    run.approvedBy = actorId as never;
    await run.save();

    await PayrollRecordModel.updateMany({ payrollRunId: run._id }, { status: 'approved' });
    const records = await PayrollRecordModel.find({ payrollRunId: run._id });
    for (const record of records) {
      const employee = await EmployeeModel.findById(record.employeeId).select('userId employeeId');
      const notification = await NotificationModel.create({
        userId: employee?.userId,
        title: 'Payslip ready',
        message: `Payslip for ${run.month} ${run.year} is ready for ${employee?.employeeId ?? record.employeeId.toString()}.`,
        type: 'payroll',
        channels: ['in-app', 'email'],
        read: false,
      });
      try {
        await emailQueue.add('notify-payslip', { notificationId: notification.id }, async ({ notificationId }) => {
          await processPayslipNotification(notificationId);
        });
      } catch (error) {
        logger.error(`Failed to enqueue payslip notification for payroll record ${record.id}: ${(error as Error).message}`);
      }
    }

    return run;
  }

  static async createLoanAdvance(payload: { employeeId: string; type: 'loan' | 'advance'; amount: number; monthlyDeduction: number }) {
    return LoanAdvanceModel.create({
      ...payload,
      outstandingAmount: payload.amount,
      status: 'active',
    });
  }

  static async generatePayslip(recordId: string, requester?: JwtUserPayload) {
    const record = await PayrollRecordModel.findById(recordId).populate('employeeId', 'employeeId userId firstName lastName designation');
    if (!record) {
      throw new AppError('Payroll record not found', 404);
    }

    const employee = record.employeeId as unknown as {
      _id: { toString(): string };
      userId: { toString(): string };
      employeeId: string;
      firstName: string;
      lastName: string;
      designation: string;
    };

    if (requester && requester.role !== 'superAdmin' && requester.role !== 'admin') {
      const requesterEmployee = await EmployeeModel.findOne({ userId: requester.userId, isDeleted: false }).select('_id');
      if (!requesterEmployee) {
        throw new AppError('Employee profile not found', 404);
      }

      if (requesterEmployee.id !== employee._id.toString()) {
        throw new AppError('You do not have access to this payslip', 403);
      }
    }

    const salary = record.salary ?? {
      grossSalary: 0,
      tax: 0,
      providentFund: 0,
      loanDeduction: 0,
      netSalary: 0,
    };

    return createDocumentBuffer((doc) => {
      renderBrandedHeader(doc, `Payslip - ${record.month} ${record.year}`);
      doc.text(`Employee: ${employee.firstName} ${employee.lastName}`);
      doc.text(`Employee ID: ${employee.employeeId}`);
      doc.text(`Designation: ${employee.designation}`);
      doc.moveDown();
      doc.text(`Gross Salary: ${salary.grossSalary}`);
      doc.text(`Tax: ${salary.tax}`);
      doc.text(`Provident Fund: ${salary.providentFund}`);
      doc.text(`Loan Deduction: ${salary.loanDeduction}`);
      doc.text(`Net Salary: ${salary.netSalary}`);
    });
  }

  static async generateBankFile(runId: string) {
    const records = await PayrollRecordModel.find({ payrollRunId: runId })
      .populate('employeeId', 'employeeId firstName lastName bankDetails country')
      .lean();

    return createWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Payroll');
      sheet.addRow(['Employee ID', 'Name', 'Bank', 'Account', 'IBAN', 'Currency', 'Net Salary', 'Country']);
      records.forEach((record) => {
        const employee = record.employeeId as unknown as {
          employeeId: string;
          firstName: string;
          lastName: string;
          bankDetails?: { bankName?: string; accountNo?: string; iban?: string };
        };
        sheet.addRow([
          employee.employeeId,
          `${employee.firstName} ${employee.lastName}`,
          employee.bankDetails?.bankName ?? '',
          employee.bankDetails?.accountNo ?? '',
          employee.bankDetails?.iban ?? '',
          record.currency,
          record.salary?.netSalary ?? 0,
          record.country,
        ]);
      });
    });
  }
}
