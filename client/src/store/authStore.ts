import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (accessToken: string, user: User) => void;
  clearSession: () => void;
  hydrate: () => void;
}

const storageKey = 'nexus-auth';

const emptySession = (hydrated: boolean) => ({ accessToken: null, user: null, hydrated });

const parseStoredSession = (raw: string | null) => {
  if (!raw) {
    return emptySession(true);
  }

  try {
    const parsed = JSON.parse(raw) as { accessToken?: string | null; user?: User | null };
    return {
      accessToken: parsed.accessToken ?? null,
      user: parsed.user ?? null,
      hydrated: true,
    };
  } catch {
    localStorage.removeItem(storageKey);
    return emptySession(true);
  }
};

const readStoredSession = () => {
  if (typeof window === 'undefined') {
    return emptySession(false);
  }

  return parseStoredSession(localStorage.getItem(storageKey));
};

export const useAuthStore = create<AuthState>((set) => ({
  ...readStoredSession(),
  setSession: (accessToken, user) => {
    localStorage.setItem(storageKey, JSON.stringify({ accessToken, user }));
    set({ accessToken, user, hydrated: true });
  },
  clearSession: () => {
    localStorage.removeItem(storageKey);
    set({ accessToken: null, user: null, hydrated: true });
  },
  hydrate: () => {
    set(parseStoredSession(localStorage.getItem(storageKey)));
  },
}));
