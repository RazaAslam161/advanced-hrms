import type { NextFunction, Response } from 'express';
import { AppError } from '../utils/appError';
import { verifyAccessToken } from '../utils/jwt';
import type { AuthenticatedRequest } from '../types/http';
import { UserModel } from '../../modules/auth/model';

export const authenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.replace('Bearer ', '');

  try {
    const payload = verifyAccessToken(token);

    void UserModel.findById(payload.userId)
      .select('email role permissions isActive tokenVersion')
      .lean()
      .then((user) => {
        if (!user) {
          return next(new AppError('Authentication required', 401));
        }

        if (!user.isActive) {
          return next(new AppError('Account is inactive', 403));
        }

        if (user.tokenVersion !== payload.tokenVersion) {
          return next(new AppError('Session is no longer valid', 401));
        }

        req.user = {
          userId: String(user._id),
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          tokenVersion: user.tokenVersion,
        };
        return next();
      })
      .catch((error) => next(error as Error));
  } catch (error) {
    next(new AppError((error as Error).message || 'Invalid token', 401));
  }
};
