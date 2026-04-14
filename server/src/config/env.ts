import path from 'path';
import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4001),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/nexus-hrms-metalabs'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  QUEUE_DRIVER: z.enum(['inline', 'bullmq']).default('inline'),
  FILE_STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default(path.resolve(process.cwd(), 'uploads')),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  COOKIE_SECRET: z.string().default('nexus-cookie-secret'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('noreply@nexus-hrms.local'),
  APP_NAME: z.string().default('NEXUS HRMS'),
  COMPANY_NAME: z.string().default('Meta Labs Tech'),
  COMPANY_WEBSITE: z.string().default('https://metalabstech.com'),
  COMPANY_PRIMARY_COLOR: z.string().default('#1A3C6E'),
});

export const env = envSchema.parse(process.env);
