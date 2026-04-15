import request from 'supertest';
import type { IntegrationHarness } from '../../test/integration/harness';
import { bearerHeader } from '../../test/integration/auth';
import { createDepartment, createUserWithEmployee } from '../../test/integration/factories';
import { createIntegrationHarness } from '../../test/integration/harness';

describe('leave integration', () => {
  let ctx: IntegrationHarness;

  beforeAll(async () => {
    ctx = await createIntegrationHarness();
  });

  afterAll(async () => {
    await ctx.shutdown();
  });

  beforeEach(async () => {
    await ctx.resetDatabase();
  });

  it('supports employee apply -> manager approve -> HR approve and updates balances only on final approval', async () => {
    const department = await createDepartment(ctx, { name: 'Engineering', code: 'ENG' });
    const managerAccount = await createUserWithEmployee(ctx, {
      role: 'manager',
      email: 'manager.portal@metalabstech.test',
      department: department.id,
    });
    const adminAccount = await createUserWithEmployee(ctx, {
      role: 'admin',
      email: 'hr.portal@metalabstech.test',
      department: department.id,
    });
    const employeeAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
      department: department.id,
    });

    const applyResponse = await request(ctx.app)
      .post('/api/v1/leave/apply')
      .set(bearerHeader(ctx, employeeAccount.user))
      .send({
        leaveType: 'casual',
        startDate: '2026-04-21T09:00:00.000Z',
        endDate: '2026-04-21T18:00:00.000Z',
        halfDay: false,
        reason: 'Personal errand for the day',
      });

    expect(applyResponse.status).toBe(201);
    expect(applyResponse.body.data.status).toBe('pendingManager');

    const balanceBeforeApprovals = await ctx.modules.LeaveBalanceModel.findOne({
      employeeId: employeeAccount.employee.id,
      year: 2026,
    }).lean();

    expect(balanceBeforeApprovals?.used.casual ?? 0).toBe(0);

    const managerApproval = await request(ctx.app)
      .patch(`/api/v1/leave/${applyResponse.body.data._id}/approve`)
      .set(bearerHeader(ctx, managerAccount.user))
      .send({ status: 'approved' });

    expect(managerApproval.status).toBe(200);
    expect(managerApproval.body.data.status).toBe('pendingHR');

    const balanceAfterManagerApproval = await ctx.modules.LeaveBalanceModel.findOne({
      employeeId: employeeAccount.employee.id,
      year: 2026,
    }).lean();

    expect(balanceAfterManagerApproval?.used.casual ?? 0).toBe(0);

    const hrApproval = await request(ctx.app)
      .patch(`/api/v1/leave/${applyResponse.body.data._id}/approve`)
      .set(bearerHeader(ctx, adminAccount.user))
      .send({ status: 'approved' });

    expect(hrApproval.status).toBe(200);
    expect(hrApproval.body.data.status).toBe('approved');

    const balanceAfterHrApproval = await ctx.modules.LeaveBalanceModel.findOne({
      employeeId: employeeAccount.employee.id,
      year: 2026,
    }).lean();

    expect(balanceAfterHrApproval?.used.casual).toBe(1);
  });

  it('blocks super admin personal leave requests without an employee selection and keeps employee lists self-scoped', async () => {
    const department = await createDepartment(ctx, { name: 'HR', code: 'HRS' });
    const superAdminAccount = await createUserWithEmployee(ctx, {
      role: 'superAdmin',
      email: 'zia.aslam@metalabstech.test',
      department: department.id,
    });
    const firstEmployee = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.one@metalabstech.test',
      department: department.id,
    });
    const secondEmployee = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.two@metalabstech.test',
      department: department.id,
    });

    const superAdminApply = await request(ctx.app)
      .post('/api/v1/leave/apply')
      .set(bearerHeader(ctx, superAdminAccount.user))
      .send({
        leaveType: 'annual',
        startDate: '2026-04-23T09:00:00.000Z',
        endDate: '2026-04-23T18:00:00.000Z',
        halfDay: false,
        reason: 'Executive calendar block',
      });

    expect(superAdminApply.status).toBe(400);
    expect(superAdminApply.body.message).toBe('Super Admin can only create leave requests on behalf of an employee');

    await Promise.all([
      request(ctx.app)
        .post('/api/v1/leave/apply')
        .set(bearerHeader(ctx, firstEmployee.user))
        .send({
          leaveType: 'sick',
          startDate: '2026-04-24T09:00:00.000Z',
          endDate: '2026-04-24T18:00:00.000Z',
          halfDay: false,
          reason: 'Medical appointment and recovery',
        }),
      request(ctx.app)
        .post('/api/v1/leave/apply')
        .set(bearerHeader(ctx, secondEmployee.user))
        .send({
          leaveType: 'casual',
          startDate: '2026-04-25T09:00:00.000Z',
          endDate: '2026-04-25T18:00:00.000Z',
          halfDay: false,
          reason: 'Family obligation in Lahore',
        }),
    ]);

    const employeeLeaveList = await request(ctx.app).get('/api/v1/leave').set(bearerHeader(ctx, firstEmployee.user));

    expect(employeeLeaveList.status).toBe(200);
    expect(employeeLeaveList.body.data).toHaveLength(1);
    expect(employeeLeaveList.body.data[0].employeeId.employeeId).toBe(firstEmployee.employee.employeeId);
  });
});
