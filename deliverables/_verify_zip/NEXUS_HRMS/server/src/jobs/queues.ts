import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis';

type InlineHandler<T> = (payload: T) => Promise<void>;

export interface QueueAdapter<T> {
  add: (name: string, payload: T, handler?: InlineHandler<T>) => Promise<void>;
}

const createQueueAdapter = <T>(queueName: string): QueueAdapter<T> => {
  const connection = getRedisClient();
  if (connection) {
    const queue = new Queue(queueName, { connection });
    return {
      add: async (name, payload) => {
        await queue.add(name, payload as object);
      },
    };
  }

  return {
    add: async (_name, payload, handler) => {
      if (handler) {
        await handler(payload);
      }
    },
  };
};

export const payrollQueue = createQueueAdapter<{ payrollRunId: string }>('payroll');
export const reportQueue = createQueueAdapter<{ reportId: string }>('reports');
export const emailQueue = createQueueAdapter<{ notificationId: string }>('emails');
