import { differenceInCalendarDays, eachDayOfInterval, getYear, isWeekend } from 'date-fns';
import { AppError } from '../../common/utils/appError';
import type { JwtUserPayload } from '../../common/utils/jwt';
import { EmployeeModel } from '../employee/model';
import { LeaveBalanceModel, LeavePolicyModel, LeaveRequestModel } from './model';

const defaultPolicies = [
  { leaveType: 'casual', annualAllowance: 10, carryForward: true, maxCarryForwardDays: 5 },
  { leaveType: 'sick', annualAllowance: 8, carryForward: false, maxCarryForwardDays: 0 },
  { leaveType: 'annual', annualAllowance: 14, carryForward: true, maxCarryForwardDays: 7 },
  { leaveType: 'unpaid', annualAllowance: 0, carryForward: false, maxCarryForwardDays: 0 },
  { leaveType: 'maternity', annualAllowance: 90, carryForward: false, maxCarryForwardDays: 0 },
  { leaveType: 'paternity', annualAllowance: 30, carryForward: false, maxCarryForwardDays: 0 },
] as const;

const ensurePolicies = async () => {
  const count = await LeavePolicyModel.countDocuments();
  if (count === 0) {
    await Promise.all(
      defaultPolicies.map((policy) =>
        LeavePolicyModel.updateOne(
          { leaveType: policy.leaveType },
          { $setOnInsert: policy },
          { upsert: true },
        ),
      ),
    );
  }
};

const ensureBalance = async (employeeId: string, year: number) => {
  await ensurePolicies();
  let balance = await LeaveBalanceModel.findOne({ employeeId, year });
  if (!balance) {
    balance = await LeaveBalanceModel.create({
      employeeId,
      year,
      balances: {
        casual: 10,
        sick: 8,
        annual: 14,
        unpaid: 0,
        maternity: 90,
        paternity: 30,
      },
      used: {
        casual: 0,
        sick: 0,
        annual: 0,
        unpaid: 0,
        maternity: 0,
        paternity: 0,
      },
    });
  }
  return balance;
};

const calculateRequestedDays = (startDate: Date, endDate: Date, halfDay: boolean) => {
  const total = differenceInCalendarDays(endDate, startDate) + 1;
  const interval = eachDayOfInterval({ start: startDate, end: endDate });
  const weekendDays = interval.filter((day) => isWeekend(day)).length;
  const sandwichApplied = total > 1 && weekendDays > 0;
  const days = halfDay ? 0.5 : total + (sandwichApplied ? weekendDays : 0);
  return { days, sandwichApplied };
};

export class LeaveService {
  static async policies() {
    await ensurePolicies();
    return LeavePolicyModel.find().sort({ annualAllowance: -1 }).lean();
  }

  static async balancesForUser(userId: string) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false });
    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    const balance = await ensureBalance(employee.id, getYear(new Date()));
    return balance.toObject();
  }

  static async apply(
    requester: JwtUserPayload,
    payload: {
      employeeId?: string;
      leaveType: 'casual' | 'sick' | 'annual' | 'unpaid' | 'maternity' | 'paternity';
      startDate: string;
      endDate: string;
      halfDay: boolean;
      reason: string;
    },
  ) {
    let employee;
    if (requester.role === 'superAdmin') {
      if (!payload.employeeId) {
        throw new AppError('Super Admin can only create leave requests on behalf of an employee', 400);
      }
      employee = await EmployeeModel.findOne({ _id: payload.employeeId, isDeleted: false });
    } else if (requester.role === 'admin' && payload.employeeId) {
      employee = await EmployeeModel.findOne({ _id: payload.employeeId, isDeleted: false });
    } else {
      employee = await EmployeeModel.findOne({ userId: requester.userId, isDeleted: false });
    }

    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);
    const { days, sandwichApplied } = calculateRequestedDays(startDate, endDate, payload.halfDay);
    const balance = await ensureBalance(employee.id, getYear(startDate));
    const balances = balance.balances as Record<string, number>;
    const used = balance.used as Record<string, number>;

    if (payload.leaveType !== 'unpaid' && (balances[payload.leaveType] ?? 0) - (used[payload.leaveType] ?? 0) < days) {
      throw new AppError(`Insufficient ${payload.leaveType} leave balance`, 400);
    }

    return LeaveRequestModel.create({
      employeeId: employee._id,
      leaveType: payload.leaveType,
      startDate,
      endDate,
      days,
      halfDay: payload.halfDay,
      sandwichApplied,
      reason: payload.reason,
      status: 'pendingManager',
    });
  }

  static async list(query: { employeeId?: string; status?: string; department?: string }, requester?: JwtUserPayload) {
    let scopedEmployeeId = query.employeeId;
    if (requester?.role === 'employee') {
      const employee = await EmployeeModel.findOne({ userId: requester.userId, isDeleted: false }).select('_id');
      if (!employee) {
        throw new AppError('Employee profile not found', 404);
      }
      scopedEmployeeId = employee.id;
    }

    const records = await LeaveRequestModel.find({
      ...(scopedEmployeeId ? { employeeId: scopedEmployeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'employeeId',
        select: 'employeeId firstName lastName department designation',
        match: query.department ? { department: query.department } : {},
      })
      .lean();

    return records.filter((record) => record.employeeId);
  }

  static async approve(
    requestId: string,
    approver: { userId: string; role: string },
    decision: { status: 'approved' | 'rejected'; rejectionReason?: string },
  ) {
    const request = await LeaveRequestModel.findById(requestId);
    if (!request) {
      throw new AppError('Leave request not found', 404);
    }

    if (decision.status === 'rejected') {
      request.approvals = request.approvals ?? {};
      request.status = 'rejected';
      request.approvals.rejectedBy = request.approvals.rejectedBy ?? (approver.userId as never);
      request.approvals.rejectedAt = new Date();
      request.approvals.rejectionReason = decision.rejectionReason;
      await request.save();
      return request;
    }

    if (approver.role === 'manager' && request.status === 'pendingManager') {
      request.approvals = request.approvals ?? {};
      request.status = 'pendingHR';
      request.approvals.managerApprovedBy = approver.userId as never;
      request.approvals.managerApprovedAt = new Date();
      await request.save();
      return request;
    }

    if ((approver.role === 'admin' || approver.role === 'superAdmin') && request.status === 'pendingHR') {
      request.approvals = request.approvals ?? {};
      request.status = 'approved';
      request.approvals.hrApprovedBy = approver.userId as never;
      request.approvals.hrApprovedAt = new Date();
      await request.save();

      const balance = await ensureBalance(String(request.employeeId), getYear(request.startDate));
      const used = balance.used as Record<string, number>;
      used[request.leaveType] = (used[request.leaveType] ?? 0) + request.days;
      balance.used = used as never;
      await balance.save();
      return request;
    }

    throw new AppError('You cannot approve this request at its current stage', 400);
  }

  static async calendar(query: { department?: string; startDate?: string; endDate?: string }) {
    const records = await this.list({ department: query.department });
    return records
      .filter((item) => {
        if (!query.startDate || !query.endDate) {
          return true;
        }
        return item.startDate <= new Date(query.endDate) && item.endDate >= new Date(query.startDate);
      })
      .map((item) => {
        const employee = item.employeeId as unknown as { firstName: string; lastName: string };
        return {
        id: item._id,
        title: `${employee.firstName} ${employee.lastName}`,
        startDate: item.startDate,
        endDate: item.endDate,
        leaveType: item.leaveType,
        status: item.status,
      };
      });
  }

  static async analytics() {
    const records = await LeaveRequestModel.find().lean();
    const total = records.length;
    const approved = records.filter((item) => item.status === 'approved').length;
    const breakdown = records.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.leaveType] = (accumulator[item.leaveType] ?? 0) + item.days;
      return accumulator;
    }, {});

    return {
      totalRequests: total,
      approvedRequests: approved,
      approvalRate: total === 0 ? 0 : Number(((approved / total) * 100).toFixed(2)),
      breakdown,
    };
  }
}
