import { Worker, type ConnectionOptions } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { logger } from '../common/utils/logger';
import { processPayslipNotification, processPayrollRun } from '../modules/payroll/service';

export const registerWorkers = (): void => {
  const connection = getRedisClient();
  if (!connection) {
    logger.info('BullMQ disabled: running inline job adapter');
    return;
  }

  const workerConnection = connection as unknown as ConnectionOptions;
  new Worker('payroll', async (job) => processPayrollRun(String(job.data.payrollRunId)), { connection: workerConnection });
  new Worker('reports', async () => undefined, { connection: workerConnection });
  new Worker('emails', async (job) => processPayslipNotification(String(job.data.notificationId)), {
    connection: workerConnection,
  });
};
