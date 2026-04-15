import request from 'supertest';
import type { IntegrationHarness } from './harness';

export const createAccessToken = (
  ctx: IntegrationHarness,
  user: {
    id?: string;
    _id?: { toString(): string } | string;
    email: string;
    role: 'superAdmin' | 'admin' | 'manager' | 'employee' | 'recruiter';
    permissions: string[];
    tokenVersion?: number;
  },
) =>
  ctx.modules.signAccessToken({
    userId: user.id ?? (typeof user._id === 'string' ? user._id : user._id?.toString() ?? ''),
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    tokenVersion: user.tokenVersion ?? 0,
  });

export const bearerHeader = (ctx: IntegrationHarness, user: Parameters<typeof createAccessToken>[1]) => ({
  Authorization: `Bearer ${createAccessToken(ctx, user)}`,
});

export const loginAs = async (ctx: IntegrationHarness, email: string, password: string) => {
  const agent = request.agent(ctx.app);
  const response = await agent.post('/api/v1/auth/login').send({ email, password });
  return { agent, response };
};
