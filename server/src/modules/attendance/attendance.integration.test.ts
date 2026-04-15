import { format } from 'date-fns';
import request from 'supertest';
import type { IntegrationHarness } from '../../test/integration/harness';
import { bearerHeader } from '../../test/integration/auth';
import { createUserWithEmployee } from '../../test/integration/factories';
import { createIntegrationHarness } from '../../test/integration/harness';

const buildTimestampForToday = (hours: number, minutes = 0) => {
  const value = new Date();
  value.setHours(hours, minutes, 0, 0);
  return value.toISOString();
};

describe('attendance integration', () => {
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

  it('records check-in, check-out, employee list, and self-scoped dashboard data', async () => {
    const employeeAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
    });

    const checkInTimestamp = buildTimestampForToday(4, 5);
    const checkOutTimestamp = buildTimestampForToday(13, 5);

    const checkIn = await request(ctx.app)
      .post('/api/v1/attendance/check-in')
      .set(bearerHeader(ctx, employeeAccount.user))
      .send({
        lat: 31.5204,
        lng: 74.3587,
        timestamp: checkInTimestamp,
      });

    expect(checkIn.status).toBe(200);
    expect(checkIn.body.data.status).toBe('present');

    const duplicateCheckIn = await request(ctx.app)
      .post('/api/v1/attendance/check-in')
      .set(bearerHeader(ctx, employeeAccount.user))
      .send({
        lat: 31.5204,
        lng: 74.3587,
        timestamp: checkInTimestamp,
      });

    expect(duplicateCheckIn.status).toBe(409);

    const checkOut = await request(ctx.app)
      .post('/api/v1/attendance/check-out')
      .set(bearerHeader(ctx, employeeAccount.user))
      .send({
        lat: 31.5204,
        lng: 74.3587,
        timestamp: checkOutTimestamp,
      });

    expect(checkOut.status).toBe(200);
    expect(checkOut.body.data.totalHours).toBeCloseTo(9, 1);

    const listResponse = await request(ctx.app)
      .get('/api/v1/attendance')
      .set(bearerHeader(ctx, employeeAccount.user));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].employeeId.employeeId).toBe(employeeAccount.employee.employeeId);

    const dashboardResponse = await request(ctx.app)
      .get('/api/v1/attendance/dashboard')
      .set(bearerHeader(ctx, employeeAccount.user));

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.data.totalCheckedIn).toBe(0);
    expect(dashboardResponse.body.data.totalCheckedOut).toBe(1);
    expect(dashboardResponse.body.data.live).toHaveLength(1);

    const monthStart = new Date(checkInTimestamp);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyReport = await request(ctx.app)
      .get(`/api/v1/attendance/monthly/${employeeAccount.employee.id}`)
      .set(bearerHeader(ctx, employeeAccount.user))
      .query({ month: monthStart.toISOString() });

    expect(monthlyReport.status).toBe(200);
    expect(monthlyReport.body.data[0].date).toBe(format(new Date(checkInTimestamp), 'yyyy-MM-dd'));
  });

  it('creates and updates attendance shifts through admin access', async () => {
    const adminAccount = await createUserWithEmployee(ctx, {
      role: 'superAdmin',
      email: 'zia.aslam@metalabstech.test',
    });

    const createShift = await request(ctx.app)
      .post('/api/v1/attendance/shifts')
      .set(bearerHeader(ctx, adminAccount.user))
      .send({
        name: 'Evening Shift',
        code: 'eve',
        startTime: '12:00',
        endTime: '21:00',
        gracePeriodMinutes: 15,
        workDays: [1, 2, 3, 4, 5],
        overtimeThresholdHours: 8,
        isDefault: true,
      });

    expect(createShift.status).toBe(201);
    expect(createShift.body.data.code).toBe('EVE');

    const listShifts = await request(ctx.app)
      .get('/api/v1/attendance/shifts')
      .set(bearerHeader(ctx, adminAccount.user));

    expect(listShifts.status).toBe(200);
    expect(listShifts.body.data).toHaveLength(1);

    const updateShift = await request(ctx.app)
      .patch(`/api/v1/attendance/shifts/${createShift.body.data._id}`)
      .set(bearerHeader(ctx, adminAccount.user))
      .send({
        gracePeriodMinutes: 20,
        endTime: '21:30',
      });

    expect(updateShift.status).toBe(200);
    expect(updateShift.body.data.gracePeriodMinutes).toBe(20);
    expect(updateShift.body.data.endTime).toBe('21:30');
  });

  it('submits overtime against the caller attendance record and allows admin approval', async () => {
    const employeeAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
    });

    const approverAccount = await createUserWithEmployee(ctx, {
      role: 'superAdmin',
      email: 'zia.aslam@metalabstech.test',
    });

    const checkIn = await request(ctx.app)
      .post('/api/v1/attendance/check-in')
      .set(bearerHeader(ctx, employeeAccount.user))
      .send({
        lat: 31.5204,
        lng: 74.3587,
        timestamp: buildTimestampForToday(4, 0),
      });

    const overtimeRequest = await request(ctx.app)
      .post('/api/v1/attendance/overtime')
      .set(bearerHeader(ctx, employeeAccount.user))
      .send({
        attendanceId: checkIn.body.data._id,
        hours: 2,
        reason: 'Release stabilization support',
      });

    expect(overtimeRequest.status).toBe(201);
    expect(overtimeRequest.body.data.status).toBe('pending');

    const approveRequest = await request(ctx.app)
      .patch(`/api/v1/attendance/overtime/${overtimeRequest.body.data._id}`)
      .set(bearerHeader(ctx, approverAccount.user))
      .send({ status: 'approved' });

    expect(approveRequest.status).toBe(200);
    expect(approveRequest.body.data.status).toBe('approved');

    const approverDashboard = await request(ctx.app)
      .get('/api/v1/attendance/dashboard')
      .set(bearerHeader(ctx, approverAccount.user));

    expect(approverDashboard.status).toBe(200);
    expect(approverDashboard.body.data.totalCheckedIn).toBe(1);
  });
});
