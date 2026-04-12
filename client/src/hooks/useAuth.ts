import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const auth = useAuthStore();

  useEffect(() => {
    auth.hydrate();
  }, []);

  return auth;
};
