import request from 'supertest';
import type { IntegrationHarness } from '../../test/integration/harness';
import { bearerHeader } from '../../test/integration/auth';
import { createDepartment, createUserWithEmployee } from '../../test/integration/factories';
import { createIntegrationHarness } from '../../test/integration/harness';

describe('payroll integration', () => {
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

  it('processes and approves payroll runs and generates payroll records', async () => {
    const department = await createDepartment(ctx, { name: 'Engineering', code: 'ENG' });
    const adminAccount = await createUserWithEmployee(ctx, {
      role: 'admin',
      email: 'hr.portal@metalabstech.test',
      department: department.id,
    });
    await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.one@metalabstech.test',
      department: department.id,
    });
    await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.two@metalabstech.test',
      department: department.id,
    });

    const processResponse = await request(ctx.app)
      .post('/api/v1/payroll/process')
      .set(bearerHeader(ctx, adminAccount.user))
      .send({
        month: 'April',
        year: 2026,
      });

    expect(processResponse.status).toBe(201);

    const payrollRun = await ctx.modules.PayrollRunModel.findById(processResponse.body.data._id).lean();
    const payrollRecords = await ctx.modules.PayrollRecordModel.find({ payrollRunId: processResponse.body.data._id }).lean();

    expect(payrollRun?.status).toBe('pendingApproval');
    expect(payrollRecords.length).toBeGreaterThanOrEqual(3);

    const approveResponse = await request(ctx.app)
      .patch(`/api/v1/payroll/runs/${processResponse.body.data._id}/approve`)
      .set(bearerHeader(ctx, adminAccount.user))
      .send({});

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.data.status).toBe('approved');

    const approvedRecords = await ctx.modules.PayrollRecordModel.find({ payrollRunId: processResponse.body.data._id }).lean();
    expect(approvedRecords.every((record) => record.status === 'approved')).toBe(true);
  });

  it('scopes payroll records to the employee and blocks payslip access to other employee records', async () => {
    const department = await createDepartment(ctx, { name: 'Engineering', code: 'ENG' });
    const adminAccount = await createUserWithEmployee(ctx, {
      role: 'admin',
      email: 'hr.portal@metalabstech.test',
      department: department.id,
    });
    const employeeOne = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.one@metalabstech.test',
      department: department.id,
    });
    const employeeTwo = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.two@metalabstech.test',
      department: department.id,
    });

    const runResponse = await request(ctx.app)
      .post('/api/v1/payroll/process')
      .set(bearerHeader(ctx, adminAccount.user))
      .send({
        month: 'May',
        year: 2026,
      });

    await request(ctx.app)
      .patch(`/api/v1/payroll/runs/${runResponse.body.data._id}/approve`)
      .set(bearerHeader(ctx, adminAccount.user))
      .send({});

    const employeeOneRecords = await request(ctx.app).get('/api/v1/payroll/records').set(bearerHeader(ctx, employeeOne.user));

    expect(employeeOneRecords.status).toBe(200);
    expect(employeeOneRecords.body.data).toHaveLength(1);
    expect(employeeOneRecords.body.data[0].employeeId.employeeId).toBe(employeeOne.employee.employeeId);

    const foreignRecord = await ctx.modules.PayrollRecordModel.findOne({ employeeId: employeeTwo.employee._id }).lean().orFail();

    const foreignPayslip = await request(ctx.app)
      .get(`/api/v1/payroll/records/${foreignRecord._id.toString()}/payslip`)
      .set(bearerHeader(ctx, employeeOne.user));

    expect(foreignPayslip.status).toBe(403);
    expect(foreignPayslip.body.message).toBe('You do not have access to this payslip');
  });

  it('keeps bank file export restricted to admins', async () => {
    const department = await createDepartment(ctx, { name: 'Engineering', code: 'ENG' });
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

    const runResponse = await request(ctx.app)
      .post('/api/v1/payroll/process')
      .set(bearerHeader(ctx, adminAccount.user))
      .send({
        month: 'June',
        year: 2026,
      });

    await request(ctx.app)
      .patch(`/api/v1/payroll/runs/${runResponse.body.data._id}/approve`)
      .set(bearerHeader(ctx, adminAccount.user))
      .send({});

    const employeeExport = await request(ctx.app)
      .get(`/api/v1/payroll/runs/${runResponse.body.data._id}/bank-file`)
      .set(bearerHeader(ctx, employeeAccount.user));

    expect(employeeExport.status).toBe(403);

    const adminExport = await request(ctx.app)
      .get(`/api/v1/payroll/runs/${runResponse.body.data._id}/bank-file`)
      .set(bearerHeader(ctx, adminAccount.user));

    expect(adminExport.status).toBe(200);
    expect(adminExport.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });
});
