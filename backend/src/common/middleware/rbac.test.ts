import type { NextFunction, Request, Response } from 'express';
import { authorize } from './rbac';
import type { AuthenticatedRequest } from '../types/http';

const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

const makeReq = (user?: AuthenticatedRequest['user']): AuthenticatedRequest =>
  ({ user } as AuthenticatedRequest);

const mockRes = {} as Response;

beforeEach(() => {
  mockNext.mockClear();
});

describe('authorize middleware', () => {
  it('calls next() when no role or permission restrictions are defined', () => {
    const req = makeReq({ userId: 'u1', role: 'employee', permissions: [] } as any);
    authorize()(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next(AppError 401) when no user is present on the request', () => {
    const req = makeReq(undefined);
    authorize()(req, mockRes, mockNext);
    const err = mockNext.mock.calls[0][0] as any;
    expect(err.statusCode).toBe(401);
  });

  it('calls next(AppError 403) when the user role is not in the allowed list', () => {
    const req = makeReq({ userId: 'u1', role: 'employee', permissions: [] } as any);
    authorize(['superAdmin'])(req, mockRes, mockNext);
    const err = mockNext.mock.calls[0][0] as any;
    expect(err.statusCode).toBe(403);
  });

  it('calls next() when the user role matches one of the allowed roles', () => {
    const req = makeReq({ userId: 'u1', role: 'manager', permissions: [] } as any);
    authorize(['manager', 'superAdmin'])(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next(AppError 403) when a required permission is missing', () => {
    const req = makeReq({ userId: 'u1', role: 'employee', permissions: ['read:employees'] } as any);
    authorize([], ['write:employees'])(req, mockRes, mockNext);
    const err = mockNext.mock.calls[0][0] as any;
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain('Missing permission: write:employees');
  });

  it('calls next() when all required permissions are present', () => {
    const req = makeReq({ userId: 'u1', role: 'employee', permissions: ['read:employees', 'write:employees'] } as any);
    authorize([], ['read:employees', 'write:employees'])(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next() when role and permissions both match', () => {
    const req = makeReq({ userId: 'u1', role: 'manager', permissions: ['approve:leave'] } as any);
    authorize(['manager'], ['approve:leave'])(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });
});
