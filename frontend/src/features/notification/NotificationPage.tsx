import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { Button } from '../../components/ui/button';
import { useNotificationStore } from '../../store/notificationStore';
interface NotificationRow {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
}

export const NotificationPage = () => {
  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data.data as { notifications: NotificationRow[]; unreadCount: number };
    },
  });

  const markMutation = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      await api.patch(`/notifications/${id}`, { read });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    if (typeof notificationsQuery.data?.unreadCount === 'number') {
      setUnreadCount(notificationsQuery.data.unreadCount);
    }
  }, [notificationsQuery.data?.unreadCount, setUnreadCount]);

  if (notificationsQuery.isLoading) {
    return <LoadingState label="Loading notifications..." />;
  }

  if (notificationsQuery.isError) {
    return <ErrorState label="Notifications could not be loaded." />;
  }

  return (
    <DataTable<NotificationRow>
      title="Notifications"
      items={notificationsQuery.data?.notifications ?? []}
      columns={[
        { key: 'title', header: 'Title' },
        { key: 'message', header: 'Message' },
        { key: 'type', header: 'Type' },
        { key: 'read', header: 'Read', render: (item) => (item.read ? 'Yes' : 'No') },
        {
          key: 'action',
          header: 'Action',
          render: (item) => (
            <Button variant="outline" onClick={() => markMutation.mutate({ id: item._id, read: !item.read })}>
              Mark {item.read ? 'Unread' : 'Read'}
            </Button>
          ),
        },
      ]}
    />
  );
};
