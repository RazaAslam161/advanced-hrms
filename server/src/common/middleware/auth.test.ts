import request from 'supertest';
import { createApp } from '../../app';
import { UserModel } from '../../modules/auth/model';
import { signAccessToken } from '../utils/jwt';

const buildFindByIdMock = (value: unknown) => ({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(value),
  }),
});

describe('authenticate middleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects requests for inactive accounts even with a valid signed token', async () => {
    jest.spyOn(UserModel, 'findById').mockReturnValue(
      buildFindByIdMock({
        _id: 'user-1',
        email: 'employee.portal@metalabstech.com',
        role: 'employee',
        permissions: ['departments.read'],
        isActive: false,
        tokenVersion: 0,
      }) as never,
    );

    const token = signAccessToken({
      userId: 'user-1',
      email: 'employee.portal@metalabstech.com',
      role: 'employee',
      permissions: ['departments.read'],
      tokenVersion: 0,
    });

    const response = await request(createApp()).get('/api/v1/departments').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Account is inactive');
  });

  it('rejects tokens when the stored token version has moved forward', async () => {
    jest.spyOn(UserModel, 'findById').mockReturnValue(
      buildFindByIdMock({
        _id: 'user-1',
        email: 'employee.portal@metalabstech.com',
        role: 'employee',
        permissions: ['departments.read'],
        isActive: true,
        tokenVersion: 2,
      }) as never,
    );

    const token = signAccessToken({
      userId: 'user-1',
      email: 'employee.portal@metalabstech.com',
      role: 'employee',
      permissions: ['departments.read'],
      tokenVersion: 1,
    });

    const response = await request(createApp()).get('/api/v1/departments').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Session is no longer valid');
  });
});
