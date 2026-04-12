import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setSession: (accessToken: string, user: User) => void;
  clearSession: () => void;
  hydrate: () => void;
}

const storageKey = 'nexus-auth';

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => {
    localStorage.setItem(storageKey, JSON.stringify({ accessToken, user }));
    set({ accessToken, user });
  },
  clearSession: () => {
    localStorage.removeItem(storageKey);
    set({ accessToken: null, user: null });
  },
  hydrate: () => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as { accessToken: string; user: User };
    set({ accessToken: parsed.accessToken, user: parsed.user });
  },
}));
