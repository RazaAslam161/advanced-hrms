import { AppError } from './appError';

describe('AppError', () => {
  it('sets the message and default status code of 400', () => {
    const error = new AppError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('AppError');
  });

  it('accepts a custom status code', () => {
    const error = new AppError('Not found', 404);
    expect(error.statusCode).toBe(404);
  });

  it('stores validation details when provided', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const error = new AppError('Validation failed', 422, details);
    expect(error.details).toEqual(details);
  });

  it('has undefined details when not provided', () => {
    const error = new AppError('Unauthorized', 401);
    expect(error.details).toBeUndefined();
  });

  it('is an instance of Error', () => {
    const error = new AppError('Forbidden', 403);
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });
});
