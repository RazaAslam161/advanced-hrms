import type { FilterQuery, Model } from 'mongoose';
import type { PaginationMeta } from '../types/http';
import { resolvePagination } from './pagination';

export const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1),
});

export const paginatedFetch = async <T>({
  model,
  filter,
  pageInput,
  limitInput,
  sort = { createdAt: -1 },
  populate = [],
}: {
  model: Model<T>;
  filter: FilterQuery<T>;
  pageInput?: string | number;
  limitInput?: string | number;
  sort?: Record<string, 1 | -1>;
  populate?: Array<{ path: string; select?: string }>;
}) => {
  const { page, limit, skip } = resolvePagination({ page: pageInput, limit: limitInput });
  let query = model.find(filter).sort(sort).skip(skip).limit(limit);
  populate.forEach((item) => {
    query = query.populate(item.path, item.select);
  });
  const [items, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);
  return {
    items,
    pagination: buildPaginationMeta(page, limit, total),
  };
};
