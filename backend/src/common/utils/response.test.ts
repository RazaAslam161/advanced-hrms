import { sendSuccess } from './response';

describe('sendSuccess', () => {
  it('returns a success envelope with the given message and data', () => {
    const result = sendSuccess('Fetched successfully', { id: '1', name: 'Alice' });
    expect(result.success).toBe(true);
    expect(result.message).toBe('Fetched successfully');
    expect(result.data).toEqual({ id: '1', name: 'Alice' });
  });

  it('includes pagination metadata when provided', () => {
    const pagination = { page: 2, limit: 10, total: 50, totalPages: 5 };
    const result = sendSuccess('List fetched', [], pagination);
    expect(result.pagination).toEqual(pagination);
  });

  it('leaves pagination undefined when not provided', () => {
    const result = sendSuccess('Created', { id: '42' });
    expect(result.pagination).toBeUndefined();
  });

  it('works with null data', () => {
    const result = sendSuccess('Deleted', null);
    expect(result.data).toBeNull();
  });
});
