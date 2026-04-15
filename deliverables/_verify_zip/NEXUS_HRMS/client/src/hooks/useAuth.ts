import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const auth = useAuthStore();

  useEffect(() => {
    if (!auth.hydrated) {
      auth.hydrate();
    }
  }, [auth]);

  return auth;
};
