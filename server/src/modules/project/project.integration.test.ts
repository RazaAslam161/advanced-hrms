import request from 'supertest';
import type { IntegrationHarness } from '../../test/integration/harness';
import { bearerHeader } from '../../test/integration/auth';
import { createDepartment, createUserWithEmployee } from '../../test/integration/factories';
import { createIntegrationHarness } from '../../test/integration/harness';

describe('project integration', () => {
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

  it('creates a project and lists it for assigned members only', async () => {
    const department = await createDepartment(ctx, { name: 'Engineering', code: 'ENG' });
    const managerAccount = await createUserWithEmployee(ctx, {
      role: 'manager',
      email: 'manager.portal@metalabstech.test',
      department: department.id,
    });
    const memberAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
      department: department.id,
    });
    const outsiderAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'outsider.portal@metalabstech.test',
      department: department.id,
    });

    const createResponse = await request(ctx.app)
      .post('/api/v1/projects')
      .set(bearerHeader(ctx, managerAccount.user))
      .send({
        name: 'Meta AI Copilot',
        code: 'mai-01',
        clientName: 'Internal',
        department: department.id,
        managerId: managerAccount.employee.id,
        memberIds: [memberAccount.employee.id],
        description: 'Internal productivity project for delivery acceleration.',
        status: 'planning',
        health: 'green',
        progress: 10,
        startDate: new Date('2026-04-01T09:00:00.000Z').toISOString(),
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.code).toBe('MAI-01');

    const employeeList = await request(ctx.app).get('/api/v1/projects').set(bearerHeader(ctx, memberAccount.user));
    expect(employeeList.status).toBe(200);
    expect(employeeList.body.data).toHaveLength(1);
    expect(employeeList.body.data[0].name).toBe('Meta AI Copilot');

    const outsiderList = await request(ctx.app).get('/api/v1/projects').set(bearerHeader(ctx, outsiderAccount.user));
    expect(outsiderList.status).toBe(200);
    expect(outsiderList.body.data).toHaveLength(0);
  });

  it('updates and deletes projects through manager access', async () => {
    const department = await createDepartment(ctx, { name: 'Engineering', code: 'ENG' });
    const managerAccount = await createUserWithEmployee(ctx, {
      role: 'manager',
      email: 'manager.portal@metalabstech.test',
      department: department.id,
    });

    const project = await ctx.modules.ProjectModel.create({
      name: 'NEXUS Launch',
      code: 'NEX-01',
      clientName: 'Meta Labs Tech',
      department: department._id,
      managerId: managerAccount.employee._id,
      memberIds: [],
      description: 'Launch workspace for the internal HR platform.',
      status: 'planning',
      health: 'green',
      progress: 25,
      startDate: new Date('2026-04-01T09:00:00.000Z'),
    });

    const updateResponse = await request(ctx.app)
      .patch(`/api/v1/projects/${project.id}`)
      .set(bearerHeader(ctx, managerAccount.user))
      .send({
        progress: 45,
        status: 'active',
        health: 'amber',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.progress).toBe(45);
    expect(updateResponse.body.data.status).toBe('active');

    const deleteResponse = await request(ctx.app)
      .delete(`/api/v1/projects/${project.id}`)
      .set(bearerHeader(ctx, managerAccount.user));

    expect(deleteResponse.status).toBe(200);

    const storedProject = await ctx.modules.ProjectModel.findById(project.id).lean();
    expect(storedProject?.isDeleted).toBe(true);
  });

  it('allows assigned users to submit project updates and blocks unassigned users', async () => {
    const department = await createDepartment(ctx, { name: 'Engineering', code: 'ENG' });
    const managerAccount = await createUserWithEmployee(ctx, {
      role: 'manager',
      email: 'manager.portal@metalabstech.test',
      department: department.id,
    });
    const memberAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
      department: department.id,
    });
    const outsiderAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'outsider.portal@metalabstech.test',
      department: department.id,
    });

    const project = await ctx.modules.ProjectModel.create({
      name: 'Delivery Portal',
      code: 'DVP-01',
      clientName: 'Meta Labs Tech',
      department: department._id,
      managerId: managerAccount.employee._id,
      memberIds: [memberAccount.employee._id],
      description: 'Project workspace used for internal delivery updates.',
      status: 'planning',
      health: 'green',
      progress: 15,
      startDate: new Date('2026-04-01T09:00:00.000Z'),
    });

    const memberUpdate = await request(ctx.app)
      .post(`/api/v1/projects/${project.id}/updates`)
      .set(bearerHeader(ctx, memberAccount.user))
      .send({
        summary: 'Completed the employee portal workboard and synced the UI.',
        blockers: '',
        progress: 60,
        projectStatus: 'active',
      });

    expect(memberUpdate.status).toBe(200);
    expect(memberUpdate.body.data.progress).toBe(60);
    expect(memberUpdate.body.data.status).toBe('active');
    expect(memberUpdate.body.data.updates).toHaveLength(1);

    const outsiderUpdate = await request(ctx.app)
      .post(`/api/v1/projects/${project.id}/updates`)
      .set(bearerHeader(ctx, outsiderAccount.user))
      .send({
        summary: 'Attempted update from an unrelated employee account.',
        blockers: 'Access should be blocked.',
        progress: 20,
        projectStatus: 'active',
      });

    expect(outsiderUpdate.status).toBe(403);
    expect(outsiderUpdate.body.message).toBe('You are not assigned to this project');
  });
});
