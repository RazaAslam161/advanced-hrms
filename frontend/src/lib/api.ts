import axios from 'axios';
import { getApiBaseUrl } from './constants';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl = String(error.config?.url ?? '');
    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    if (error.response?.status === 401 && !error.config?._retry && !isAuthRequest) {
      error.config._retry = true;
      try {
        const { data } = await axios.post(
          `${getApiBaseUrl()}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        useAuthStore.getState().setSession(data.data.accessToken, data.data.user);
        error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api.request(error.config);
      } catch {
        useAuthStore.getState().clearSession();
      }
    }
    throw error;
  },
);