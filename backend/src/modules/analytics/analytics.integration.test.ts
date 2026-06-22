import request from 'supertest';
import type { IntegrationHarness } from '../../test/integration/harness';
import { bearerHeader } from '../../test/integration/auth';
import { createDepartment, createUserWithEmployee } from '../../test/integration/factories';
import { createIntegrationHarness } from '../../test/integration/harness';

describe('analytics live activity integration', () => {
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

  it('returns live activity counts and per-category employee detail', async () => {
    const department = await createDepartment(ctx, { name: 'Operations', code: 'OPS' });
    const superAdmin = await createUserWithEmployee(ctx, {
      role: 'superAdmin',
      email: 'live.super@metalabstech.test',
      department: department.id,
    });
    const working = await createUserWithEmployee(ctx, { role: 'employee', email: 'live.working@metalabstech.test', department: department.id });
    const signedOut = await createUserWithEmployee(ctx, { role: 'employee', email: 'live.signedout@metalabstech.test', department: department.id });
    const onLeave = await createUserWithEmployee(ctx, { role: 'employee', email: 'live.leave@metalabstech.test', department: department.id });

    const now = new Date();
    await ctx.modules.AttendanceRecordModel.create({
      employeeId: working.employee._id,
      date: now,
      checkIn: now,
      status: 'present',
      totalHours: 0,
    });
    await ctx.modules.AttendanceRecordModel.create({
      employeeId: signedOut.employee._id,
      date: now,
      checkIn: now,
      checkOut: now,
      status: 'late',
      totalHours: 8,
    });
    await ctx.modules.LeaveRequestModel.create({
      employeeId: onLeave.employee._id,
      leaveType: 'casual',
      startDate: now,
      endDate: now,
      days: 1,
      reason: 'Approved day off today',
      status: 'approved',
    });

    const header = bearerHeader(ctx, superAdmin.user);

    const summary = await request(ctx.app).get('/api/v1/analytics/live').set(header);
    expect(summary.status).toBe(200);
    expect(summary.body.data.present).toBeGreaterThanOrEqual(2);
    expect(summary.body.data.stillWorking).toBeGreaterThanOrEqual(1);
    expect(summary.body.data.signedOut).toBeGreaterThanOrEqual(1);
    expect(summary.body.data.onLeave).toBeGreaterThanOrEqual(1);

    const stillWorking = await request(ctx.app).get('/api/v1/analytics/live/stillWorking').set(header);
    expect(stillWorking.status).toBe(200);
    expect(stillWorking.body.data.some((entry: { id: string }) => entry.id === working.employee.id)).toBe(true);

    const leaveList = await request(ctx.app).get('/api/v1/analytics/live/onLeave').set(header);
    expect(leaveList.status).toBe(200);
    expect(leaveList.body.data.some((entry: { id: string }) => entry.id === onLeave.employee.id)).toBe(true);

    const notCheckedIn = await request(ctx.app).get('/api/v1/analytics/live/notCheckedIn').set(header);
    expect(notCheckedIn.status).toBe(200);
    expect(Array.isArray(notCheckedIn.body.data)).toBe(true);
  });
});
