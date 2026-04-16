import request from 'supertest';
import type { IntegrationHarness } from '../../test/integration/harness';
import { bearerHeader, createAccessToken, loginAs } from '../../test/integration/auth';
import { createDepartment, createUserWithEmployee } from '../../test/integration/factories';
import { createIntegrationHarness } from '../../test/integration/harness';
import * as auditUtils from '../../common/utils/audit';

describe('auth integration', () => {
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

  it('logs in successfully and rejects an invalid password', async () => {
    const { password, user } = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
      firstName: 'Aiman',
      lastName: 'Anwar',
    });

    const success = await request(ctx.app).post('/api/v1/auth/login').send({
      email: user.email,
      password,
    });

    expect(success.status).toBe(200);
    expect(success.body.data.user.email).toBe(user.email);
    expect(success.body.data.accessToken).toEqual(expect.any(String));
    expect(success.headers['set-cookie']).toEqual(expect.arrayContaining([expect.stringContaining('refreshToken=')]));

    const failure = await request(ctx.app).post('/api/v1/auth/login').send({
      email: user.email,
      password: 'WrongMeta@123',
    });

    expect(failure.status).toBe(401);
    expect(failure.body.message).toBe('Invalid email or password');
  });

  it('rotates refresh tokens and invalidates the previous refresh token', async () => {
    const { password, user } = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'refresh.portal@metalabstech.test',
    });

    const { agent, response: loginResponse } = await loginAs(ctx, user.email, password);
    const originalCookie = loginResponse.headers['set-cookie'][0];

    const refreshResponse = await agent.post('/api/v1/auth/refresh').send({});

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.headers['set-cookie'][0]).not.toBe(originalCookie);

    const replayedRefresh = await request(ctx.app).post('/api/v1/auth/refresh').set('Cookie', originalCookie).send({});

    expect(replayedRefresh.status).toBe(401);
    expect(replayedRefresh.body.message).toBe('Refresh session is invalid');
  });

  it('allows super admin and admin registration, but blocks employee registration', async () => {
    const department = await createDepartment(ctx, { name: 'Engineering', code: 'ENG' });
    const { user: superAdmin } = await createUserWithEmployee(ctx, {
      role: 'superAdmin',
      email: 'zia.aslam@metalabstech.test',
      firstName: 'Zia',
      lastName: 'Aslam',
    });
    const { user: admin } = await createUserWithEmployee(ctx, {
      role: 'admin',
      email: 'hr.portal@metalabstech.test',
      firstName: 'Ayesha',
      lastName: 'Khan',
      department: department.id,
    });
    const { user: employee } = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
    });

    const payload = {
      email: 'new.employee@metalabstech.test',
      password: 'Meta@12345',
      role: 'employee',
      firstName: 'New',
      lastName: 'Employee',
      department: department.id,
      designation: 'QA Engineer',
    };

    const superAdminResponse = await request(ctx.app)
      .post('/api/v1/auth/register')
      .set(bearerHeader(ctx, superAdmin))
      .send(payload);

    expect(superAdminResponse.status).toBe(201);

    const adminResponse = await request(ctx.app)
      .post('/api/v1/auth/register')
      .set(bearerHeader(ctx, admin))
      .send({
        ...payload,
        email: 'new.employee.2@metalabstech.test',
      });

    expect(adminResponse.status).toBe(201);

    const employeeResponse = await request(ctx.app)
      .post('/api/v1/auth/register')
      .set(bearerHeader(ctx, employee))
      .send({
        ...payload,
        email: 'blocked.employee@metalabstech.test',
      });

    expect(employeeResponse.status).toBe(403);
    expect(employeeResponse.body.message).toBe('You do not have access to this resource');
  });

  it('blocks self permission changes and privileged account management', async () => {
    const { user: superAdmin } = await createUserWithEmployee(ctx, {
      role: 'superAdmin',
      email: 'super.admin@metalabstech.test',
    });
    const { user: admin } = await createUserWithEmployee(ctx, {
      role: 'admin',
      email: 'hr.admin@metalabstech.test',
    });

    const selfUpdate = await request(ctx.app)
      .patch(`/api/v1/auth/users/${superAdmin.id}`)
      .set(bearerHeader(ctx, superAdmin))
      .send({
        permissions: ['employees.read'],
      });

    expect(selfUpdate.status).toBe(400);
    expect(selfUpdate.body.message).toBe('You cannot change your own permissions');

    const privilegedUpdate = await request(ctx.app)
      .patch(`/api/v1/auth/users/${superAdmin.id}`)
      .set(bearerHeader(ctx, admin))
      .send({
        isActive: false,
      });

    expect(privilegedUpdate.status).toBe(403);
    expect(privilegedUpdate.body.message).toBe('HR Admin cannot manage privileged accounts');
  });

  it('blocks deactivated users from protected routes', async () => {
    const account = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'inactive.employee@metalabstech.test',
    });
    const token = createAccessToken(ctx, account.user);

    await ctx.modules.UserModel.updateOne({ _id: account.user._id }, { isActive: false });

    const response = await request(ctx.app).get('/api/v1/employees/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Account is inactive');
  });

  it('still logs in when audit logging fails', async () => {
    const { password, user } = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'audit.failure@metalabstech.test',
      firstName: 'Audit',
      lastName: 'Safe',
    });

    const auditSpy = jest.spyOn(auditUtils, 'createAuditLog').mockRejectedValueOnce(new Error('audit unavailable'));

    const response = await request(ctx.app).post('/api/v1/auth/login').send({
      email: user.email,
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(user.email);

    auditSpy.mockRestore();
  });
});
