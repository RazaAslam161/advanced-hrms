import axios from 'axios';
import { apiBaseUrl } from './constants';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: apiBaseUrl,
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
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await axios.post(`${apiBaseUrl}/auth/refresh`, {}, { withCredentials: true });
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
