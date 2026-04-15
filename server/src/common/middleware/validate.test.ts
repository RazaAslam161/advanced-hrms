import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from './validate';

const mockRes = {} as Response;
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;

beforeEach(() => {
  mockNext.mockClear();
});

const makeReq = (body: unknown, query: unknown = {}, params: unknown = {}): Request =>
  ({ body, query, params } as unknown as Request);

describe('validate middleware', () => {
  const bodySchema = z.object({ name: z.string().min(2), age: z.number().min(0) });

  it('calls next() and mutates req.body when validation passes', () => {
    const req = makeReq({ name: 'Alice', age: 30 });
    validate({ body: bodySchema })(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
    expect((req as Request).body).toEqual({ name: 'Alice', age: 30 });
  });

  it('calls next(AppError 422) when body validation fails', () => {
    const req = makeReq({ name: 'A', age: 30 });
    validate({ body: bodySchema })(req, mockRes, mockNext);
    const err = mockNext.mock.calls[0][0] as any;
    expect(err.statusCode).toBe(422);
    expect(Array.isArray(err.details)).toBe(true);
    expect(err.details[0].field).toBe('name');
  });

  it('collects errors from multiple invalid fields', () => {
    const req = makeReq({ name: 'A', age: -1 });
    validate({ body: bodySchema })(req, mockRes, mockNext);
    const err = mockNext.mock.calls[0][0] as any;
    expect(err.details.length).toBeGreaterThanOrEqual(2);
  });

  it('validates query params when a query schema is provided', () => {
    const querySchema = z.object({ page: z.string().min(1) });
    const req = makeReq({}, { page: '1' });
    validate({ query: querySchema })(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next(AppError 422) when query validation fails', () => {
    const querySchema = z.object({ page: z.string().min(1) });
    const req = makeReq({}, { page: '' });
    validate({ query: querySchema })(req, mockRes, mockNext);
    const err = mockNext.mock.calls[0][0] as any;
    expect(err.statusCode).toBe(422);
  });

  it('calls next() with no schemas (no-op)', () => {
    const req = makeReq({ anything: true });
    validate({})(req, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });
});
