import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/appError';

export const validate =
  (schema: { body?: ZodTypeAny; params?: ZodTypeAny; query?: ZodTypeAny }) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Array<{ field?: string; message: string }> = [];

    for (const [key, validator] of Object.entries(schema)) {
      if (!validator) {
        continue;
      }

      const parsed = validator.safeParse(req[key as 'body' | 'params' | 'query']);
      if (!parsed.success) {
        parsed.error.issues.forEach((issue) =>
          errors.push({
            field: issue.path.join('.') || key,
            message: issue.message,
          }),
        );
      } else {
        req[key as 'body' | 'params' | 'query'] = parsed.data;
      }
    }

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 422, errors));
    }

    next();
  };
