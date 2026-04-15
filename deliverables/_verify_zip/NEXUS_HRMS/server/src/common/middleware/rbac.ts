import type { NextFunction, Response } from 'express';
import type { Role } from '../constants/roles';
import { AppError } from '../utils/appError';
import type { AuthenticatedRequest } from '../types/http';

export const authorize =
  (allowedRoles: Role[] = [], permissions: string[] = []) =>
  (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have access to this resource', 403));
    }

    if (permissions.length > 0) {
      const permissionSet = new Set(req.user.permissions);
      const missingPermission = permissions.find((permission) => !permissionSet.has(permission));
      if (missingPermission) {
        return next(new AppError(`Missing permission: ${missingPermission}`, 403));
      }
    }

    next();
  };
