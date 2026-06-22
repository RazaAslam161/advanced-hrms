declare global {
  interface Window {
    __NEXUS_ENV__?: {
      VITE_API_URL?: string;
      VITE_SOCKET_URL?: string;
    };
  }
}

type ClientEnv = {
  VITE_API_URL?: string;
  VITE_SOCKET_URL?: string;
};

const normalizeEnvValue = (value?: string) =>
  typeof value === 'string' && value.trim() ? value : undefined;

const getViteEnv = (): ClientEnv => ({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
});

const getBrowserEnv = (): ClientEnv => {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.__NEXUS_ENV__ ?? {};
};

export const getClientEnv = (key: keyof ClientEnv, fallback: string) => {
  const value =
    normalizeEnvValue(getViteEnv()[key]) ??
    normalizeEnvValue(getBrowserEnv()[key]);

  return value ?? fallback;
};
