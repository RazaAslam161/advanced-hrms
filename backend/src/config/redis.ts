import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../common/utils/logger';

let redis: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (env.QUEUE_DRIVER !== 'bullmq') {
    return null;
  }

  if (!redis) {
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    redis.on('error', (error) => logger.error(`Redis error: ${error.message}`));
  }

  return redis;
};
