import type { PaginationMeta } from '../types/http';

export const sendSuccess = <T>(message: string, data: T, pagination?: PaginationMeta) => ({
  success: true as const,
  message,
  data,
  pagination,
});
