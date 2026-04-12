import type { Request } from 'express';
import type { JwtUserPayload } from '../utils/jwt';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiErrorShape {
  field?: string;
  message: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}
