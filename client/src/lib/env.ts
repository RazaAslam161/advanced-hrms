declare global {
  interface Window {
    __NEXUS_ENV__?: {
      VITE_API_URL?: string;
      VITE_SOCKET_URL?: string;
    };
  }
}

const getBrowserEnv = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.__NEXUS_ENV__ ?? {};
};

export const getClientEnv = (key: 'VITE_API_URL' | 'VITE_SOCKET_URL', fallback: string) => {
  const value = getBrowserEnv()[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
};
