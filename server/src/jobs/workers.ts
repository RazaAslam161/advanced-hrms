import { Worker } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { logger } from '../common/utils/logger';
import { processPayslipNotification, processPayrollRun } from '../modules/payroll/service';

export const registerWorkers = (): void => {
  const connection = getRedisClient();
  if (!connection) {
    logger.info('BullMQ disabled: running inline job adapter');
    return;
  }

  new Worker('payroll', async (job) => processPayrollRun(String(job.data.payrollRunId)), { connection });
  new Worker('reports', async () => undefined, { connection });
  new Worker('emails', async (job) => processPayslipNotification(String(job.data.notificationId)), { connection });
};
