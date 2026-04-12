import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../../config/env';
import { verifyAccessToken } from './jwt';
import { logger } from './logger';

let io: Server | null = null;

export const initializeSocket = (server: HttpServer): Server => {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }

    try {
      const user = verifyAccessToken(token);
      socket.data.user = user;
      return next();
    } catch (error) {
      return next(error as Error);
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { userId: string; role: string };
    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.role}`);
    logger.info(`Socket connected ${socket.id}`);

    socket.on('disconnect', () => logger.info(`Socket disconnected ${socket.id}`));
  });

  return io;
};

export const getSocket = (): Server | null => io;
