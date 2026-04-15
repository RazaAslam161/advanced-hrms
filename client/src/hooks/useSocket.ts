import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getClientEnv } from '../lib/env';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

let socket: Socket | null = null;

export const useSocket = () => {
  const { accessToken } = useAuthStore();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    socket = io(getClientEnv('VITE_SOCKET_URL', 'http://localhost:4001'), {
      auth: { token: accessToken },
    });

    socket.on('notifications:unread', (payload: { unreadCount: number }) => {
      setUnreadCount(payload.unreadCount);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [accessToken, setUnreadCount]);

  return socket;
};
