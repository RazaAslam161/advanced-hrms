import request from 'supertest';
import type { IntegrationHarness } from '../../test/integration/harness';
import { bearerHeader } from '../../test/integration/auth';
import { createUserWithEmployee } from '../../test/integration/factories';
import { createIntegrationHarness } from '../../test/integration/harness';

describe('notification integration', () => {
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

  it('lists scoped notifications and unread count', async () => {
    const ownAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
    });
    const otherAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'other.employee@metalabstech.test',
    });

    await ctx.modules.NotificationModel.create([
      {
        userId: ownAccount.user._id,
        title: 'Own alert',
        message: 'Assigned directly to this account',
        type: 'system',
        read: false,
      },
      {
        title: 'Global announcement',
        message: 'Visible to everyone',
        type: 'announcement',
        read: false,
      },
      {
        userId: otherAccount.user._id,
        title: 'Hidden alert',
        message: 'Should not be visible to another user',
        type: 'system',
        read: false,
      },
    ]);

    const response = await request(ctx.app).get('/api/v1/notifications').set(bearerHeader(ctx, ownAccount.user));

    expect(response.status).toBe(200);
    expect(response.body.data.notifications).toHaveLength(2);
    expect(response.body.data.unreadCount).toBe(2);
    expect(response.body.data.notifications.map((item: { title: string }) => item.title)).toEqual(
      expect.arrayContaining(['Own alert', 'Global announcement']),
    );
  });

  it('updates only the caller visible notifications', async () => {
    const ownAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
    });
    const otherAccount = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'other.employee@metalabstech.test',
    });

    const ownNotification = await ctx.modules.NotificationModel.create({
      userId: ownAccount.user._id,
      title: 'Own alert',
      message: 'Assigned directly to this account',
      type: 'system',
      read: false,
    });

    const hiddenNotification = await ctx.modules.NotificationModel.create({
      userId: otherAccount.user._id,
      title: 'Hidden alert',
      message: 'Should not be visible to another user',
      type: 'system',
      read: false,
    });

    const success = await request(ctx.app)
      .patch(`/api/v1/notifications/${ownNotification.id}`)
      .set(bearerHeader(ctx, ownAccount.user))
      .send({ read: true });

    expect(success.status).toBe(200);
    expect(success.body.data.read).toBe(true);

    const rejected = await request(ctx.app)
      .patch(`/api/v1/notifications/${hiddenNotification.id}`)
      .set(bearerHeader(ctx, ownAccount.user))
      .send({ read: true });

    expect(rejected.status).toBe(404);
    expect(rejected.body.message).toBe('Notification not found');
  });

  it('creates default preferences and persists preference updates', async () => {
    const account = await createUserWithEmployee(ctx, {
      role: 'employee',
      email: 'employee.portal@metalabstech.test',
    });

    const initial = await request(ctx.app)
      .get('/api/v1/notifications/preferences/me')
      .set(bearerHeader(ctx, account.user));

    expect(initial.status).toBe(200);
    expect(initial.body.data.preferences.leave.email).toBe(true);
    expect(initial.body.data.preferences.system.email).toBe(false);

    const update = await request(ctx.app)
      .put('/api/v1/notifications/preferences/me')
      .set(bearerHeader(ctx, account.user))
      .send({
        preferences: {
          leave: { email: false, inApp: true },
          payroll: { email: true, inApp: false },
          review: { email: false, inApp: true },
          announcement: { email: true, inApp: true },
          system: { email: false, inApp: false },
        },
      });

    expect(update.status).toBe(200);
    expect(update.body.data.preferences.leave.email).toBe(false);
    expect(update.body.data.preferences.payroll.inApp).toBe(false);
  });
});
