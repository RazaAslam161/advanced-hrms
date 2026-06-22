import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../common/utils/logger';

export const connectDatabase = async (): Promise<void> => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  logger.info(`MongoDB connected to ${env.MONGODB_URI}`);
};
