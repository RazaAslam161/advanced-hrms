import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './common/utils/logger';
import { initializeSocket } from './common/utils/socket';
import { registerWorkers } from './jobs/workers';

const bootstrap = async (): Promise<void> => {
  await connectDatabase();
  registerWorkers();
  const app = createApp();
  const server = http.createServer(app);
  initializeSocket(server);

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(
        `Port ${env.PORT} is already in use. Stop the conflicting process or set a different PORT before running the API.`,
      );
      process.exit(1);
    }

    logger.error(error.stack || error.message);
    process.exit(1);
  });

  server.listen(env.PORT, () => {
    logger.info(`NEXUS HRMS API listening on port ${env.PORT}`);
  });
};

void bootstrap().catch((error) => {
  logger.error(error.stack || error.message);
  process.exit(1);
});
