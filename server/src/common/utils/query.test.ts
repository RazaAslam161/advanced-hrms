import { buildPaginationMeta } from './query';

describe('buildPaginationMeta', () => {
  it('builds correct metadata for a typical first page', () => {
    const meta = buildPaginationMeta(1, 10, 45);
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(10);
    expect(meta.total).toBe(45);
    expect(meta.totalPages).toBe(5);
  });

  it('rounds totalPages up when total is not evenly divisible', () => {
    const meta = buildPaginationMeta(1, 10, 41);
    expect(meta.totalPages).toBe(5);
  });

  it('returns at least 1 totalPages even when total is zero', () => {
    const meta = buildPaginationMeta(1, 20, 0);
    expect(meta.totalPages).toBe(1);
  });

  it('returns correct metadata for an exact multiple', () => {
    const meta = buildPaginationMeta(2, 5, 20);
    expect(meta.totalPages).toBe(4);
    expect(meta.page).toBe(2);
  });

  it('returns 1 totalPage when total equals limit', () => {
    const meta = buildPaginationMeta(1, 10, 10);
    expect(meta.totalPages).toBe(1);
  });
});
