import path from 'path';
import request from 'supertest';
import type { IntegrationHarness } from '../../test/integration/harness';
import { bearerHeader } from '../../test/integration/auth';
import { createDepartment, createUserWithEmployee } from '../../test/integration/factories';
import { createIntegrationHarness } from '../../test/integration/harness';

const pngFixture = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2uoAAAAASUVORK5CYII=',
  'base64',
);
const pdfFixture = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');

describe('employee integration', () => {
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

  it('creates an employee with linked credentials and returns pagination on list', async () => {
    const department = await createDepartment(ctx, { name: 'Engineering', code: 'ENG' });
    const { user: admin } = await createUserWithEmployee(ctx, {
      role: 'admin',
      email: 'hr.portal@metalabstech.test',
      department: department.id,
    });

    const createResponse = await request(ctx.app)
      .post('/api/v1/employees')
      .set(bearerHeader(ctx, admin))
      .send({
        firstName: 'Ali',
        lastName: 'Raza',
        email: 'ali.raza@metalabstech.test',
        role: 'employee',
        department: department.id,
        designation: 'Backend Engineer',
        employmentType: 'full-time',
        joiningDate: new Date('2026-04-01T09:00:00.000Z').toISOString(),
        salary: {
          basic: 180000,
          houseRent: 40000,
          medical: 10000,
          transport: 5000,
          currency: 'PKR',
          bonus: 0,
        },
        timezone: 'Asia/Karachi',
        workLocation: 'onsite',
        country: 'Pakistan',
        emergencyContacts: [],
        skills: [],
        status: 'active',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.credentials.email).toBe('ali.raza@metalabstech.test');
    expect(createResponse.body.data.credentials.generatedPassword).toEqual(expect.any(String));

    const persistedUser = await ctx.modules.UserModel.findOne({ email: 'ali.raza@metalabstech.test' });
    const persistedEmployee = await ctx.modules.EmployeeModel.findOne({ userId: persistedUser?._id });

    expect(persistedUser).not.toBeNull();
    expect(persistedEmployee?.designation).toBe('Backend Engineer');

    await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'sara.khan@metalabstech.test',
      department: department.id,
    });

    const listResponse = await request(ctx.app)
      .get('/api/v1/employees?page=1&limit=1')
      .set(bearerHeader(ctx, admin));

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.pagination).toMatchObject({
      page: 1,
      limit: 1,
    });
    expect(listResponse.body.pagination.total).toBeGreaterThanOrEqual(2);
    expect(listResponse.body.data).toHaveLength(1);
  });

  it('updates self profile and keeps user + employee records in sync', async () => {
    const account = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
      firstName: 'Aiman',
      lastName: 'Anwar',
    });

    const response = await request(ctx.app)
      .patch('/api/v1/employees/me')
      .set(bearerHeader(ctx, account.user))
      .send({
        firstName: 'Aimen',
        lastName: 'Anwar',
        displayName: 'Aimen A.',
        email: 'aimen.anwar@metalabstech.test',
        phone: '+923001234567',
        timezone: 'Asia/Karachi',
        workLocation: 'hybrid',
        country: 'Pakistan',
        emergencyContacts: [
          {
            name: 'Aslam',
            relation: 'Father',
            phone: '+923009876543',
          },
        ],
      });

    expect(response.status).toBe(200);

    const [persistedUser, persistedEmployee] = await Promise.all([
      ctx.modules.UserModel.findById(account.user._id).lean(),
      ctx.modules.EmployeeModel.findById(account.employee._id).lean(),
    ]);

    expect(persistedUser?.email).toBe('aimen.anwar@metalabstech.test');
    expect(persistedUser?.firstName).toBe('Aimen');
    expect(persistedEmployee?.displayName).toBe('Aimen A.');
    expect(persistedEmployee?.phone).toBe('+923001234567');
    expect(persistedEmployee?.emergencyContacts).toHaveLength(1);
  });

  it('stores public avatar URLs and private document URLs correctly', async () => {
    const department = await createDepartment(ctx, { name: 'QA', code: 'QAT' });
    const { user: admin } = await createUserWithEmployee(ctx, {
      role: 'admin',
      email: 'hr.docs@metalabstech.test',
      department: department.id,
    });
    const account = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.docs@metalabstech.test',
      department: department.id,
    });

    const avatarResponse = await request(ctx.app)
      .post('/api/v1/employees/me/avatar')
      .set(bearerHeader(ctx, account.user))
      .attach('file', pngFixture, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(avatarResponse.status).toBe(200);
    expect(avatarResponse.body.data.avatar).toMatch(/^\/uploads\/public\/avatars\//);

    const documentResponse = await request(ctx.app)
      .post(`/api/v1/employees/${account.employee.id}/documents`)
      .set(bearerHeader(ctx, admin))
      .field('type', 'resume')
      .attach('file', pdfFixture, {
        filename: 'resume.pdf',
        contentType: 'application/pdf',
      });

    expect(documentResponse.status).toBe(200);
    expect(documentResponse.body.data.documents[0].url).toMatch(/^\/api\/v1\/assets\//);
    expect(documentResponse.body.data.documents[0].key).toContain(path.posix.join('documents', ''));
  });
});
