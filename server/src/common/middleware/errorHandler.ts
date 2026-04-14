import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError('Route not found', 404));
};

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error(error.stack || error.message);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.details,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
