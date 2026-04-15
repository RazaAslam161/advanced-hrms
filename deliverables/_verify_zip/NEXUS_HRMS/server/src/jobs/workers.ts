import { Worker } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { logger } from '../common/utils/logger';

export const registerWorkers = (): void => {
  const connection = getRedisClient();
  if (!connection) {
    logger.info('BullMQ disabled: running inline job adapter');
    return;
  }

  new Worker('payroll', async () => undefined, { connection });
  new Worker('reports', async () => undefined, { connection });
  new Worker('emails', async () => undefined, { connection });
};
