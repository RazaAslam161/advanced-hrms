import { useNotificationStore } from './notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ unreadCount: 0 });
  });

  it('starts with an unread count of 0', () => {
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('updates the unread count when setUnreadCount is called', () => {
    useNotificationStore.getState().setUnreadCount(5);
    expect(useNotificationStore.getState().unreadCount).toBe(5);
  });

  it('resets the unread count to 0', () => {
    useNotificationStore.getState().setUnreadCount(10);
    useNotificationStore.getState().setUnreadCount(0);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('overwrites the unread count with a new value', () => {
    useNotificationStore.getState().setUnreadCount(3);
    useNotificationStore.getState().setUnreadCount(7);
    expect(useNotificationStore.getState().unreadCount).toBe(7);
  });
});
