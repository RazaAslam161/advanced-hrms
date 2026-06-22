import type { PropsWithChildren, ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { User } from '../types';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useUIStore } from '../store/uiStore';

interface RenderOptions {
  route?: string;
  user?: User | null;
  accessToken?: string | null;
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const resetStores = (user: User | null = null, accessToken: string | null = null) => {
  useAuthStore.setState({
    accessToken,
    user,
    hydrated: true,
  });
  useNotificationStore.setState({ unreadCount: 0 });
  useUIStore.setState({
    sidebarOpen: true,
    darkMode: false,
    soundEnabled: true,
    widgetOrder: ['headcount', 'attendance', 'leave', 'payroll'],
  });
};

export const renderWithProviders = (ui: ReactElement, options: RenderOptions = {}) => {
  const queryClient = createTestQueryClient();
  resetStores(options.user ?? null, options.accessToken ?? (options.user ? 'test-access-token' : null));

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[options.route ?? '/']}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper }),
  };
};
