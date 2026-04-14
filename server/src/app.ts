import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env';
import { generalRateLimiter } from './common/middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler';
import { logger } from './common/utils/logger';
import { apiRouter } from './modules';

export const createApp = (): express.Express => {
  const app = express();

  // Railway runs behind a proxy
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(morgan('dev', { stream: { write: (message) => logger.http(message.trim()) } }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(mongoSanitize());

  // Keep health check before rate limiting
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Service is healthy',
      data: { uptime: process.uptime() },
    });
  });

  app.get('/', (_req, res) => {
    res.status(200).json({ success: true, message: 'NEXUS HRMS API is running' });
  });

  app.use(generalRateLimiter);

  app.use(
    '/uploads',
    express.static(path.resolve(env.UPLOAD_DIR), {
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );

  app.use('/api/v1', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
