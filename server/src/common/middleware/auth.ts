import type { NextFunction, Response } from 'express';
import { AppError } from '../utils/appError';
import { verifyAccessToken } from '../utils/jwt';
import type { AuthenticatedRequest } from '../types/http';

export const authenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.replace('Bearer ', '');

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    next(new AppError((error as Error).message || 'Invalid token', 401));
  }
};
