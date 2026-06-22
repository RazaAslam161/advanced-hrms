import { resolvePagination } from './pagination';

describe('resolvePagination', () => {
  it('returns defaults when no input is provided', () => {
    const result = resolvePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  it('calculates skip correctly for page 2', () => {
    const result = resolvePagination({ page: 2, limit: 10 });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(10);
  });

  it('clamps page to a minimum of 1 when zero is supplied', () => {
    const result = resolvePagination({ page: 0, limit: 10 });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('clamps page to a minimum of 1 when a negative value is supplied', () => {
    const result = resolvePagination({ page: -5, limit: 10 });
    expect(result.page).toBe(1);
  });

  it('clamps limit to a maximum of 100', () => {
    const result = resolvePagination({ page: 1, limit: 500 });
    expect(result.limit).toBe(100);
  });

  it('clamps limit to a minimum of 1', () => {
    const result = resolvePagination({ page: 1, limit: 0 });
    expect(result.limit).toBe(1);
  });

  it('accepts string page and limit values', () => {
    const result = resolvePagination({ page: '3', limit: '15' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(15);
    expect(result.skip).toBe(30);
  });

  it('computes skip for a large page number', () => {
    const result = resolvePagination({ page: 10, limit: 25 });
    expect(result.skip).toBe(225);
  });
});
