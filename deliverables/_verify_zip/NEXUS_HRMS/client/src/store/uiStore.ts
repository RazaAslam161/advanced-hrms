import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  soundEnabled: boolean;
  widgetOrder: string[];
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  toggleSoundEnabled: () => void;
  setWidgetOrder: (widgetOrder: string[]) => void;
  hydrate: () => void;
}

const uiStorageKey = 'nexus-ui';

const applyTheme = (darkMode: boolean) => {
  document.documentElement.classList.toggle('dark', darkMode);
  document.documentElement.classList.toggle('light', !darkMode);
};

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  darkMode: false,
  soundEnabled: true,
  widgetOrder: ['headcount', 'attendance', 'leave', 'payroll'],
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  toggleDarkMode: () => {
    const darkMode = !get().darkMode;
    applyTheme(darkMode);
    localStorage.setItem(uiStorageKey, JSON.stringify({ ...get(), darkMode }));
    set({ darkMode });
  },
  toggleSoundEnabled: () => {
    const soundEnabled = !get().soundEnabled;
    localStorage.setItem(uiStorageKey, JSON.stringify({ ...get(), soundEnabled }));
    set({ soundEnabled });
  },
  setWidgetOrder: (widgetOrder) => {
    localStorage.setItem(uiStorageKey, JSON.stringify({ ...get(), widgetOrder }));
    set({ widgetOrder });
  },
  hydrate: () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const raw = localStorage.getItem(uiStorageKey);
    if (!raw) {
      applyTheme(prefersDark);
      set({ darkMode: prefersDark, soundEnabled: true });
      return;
    }
    const parsed = JSON.parse(raw) as Partial<UIState>;
    const darkMode = parsed.darkMode ?? prefersDark;
    applyTheme(darkMode);
    set({
      sidebarOpen: parsed.sidebarOpen ?? true,
      darkMode,
      soundEnabled: parsed.soundEnabled ?? false,
      widgetOrder: parsed.widgetOrder ?? ['headcount', 'attendance', 'leave', 'payroll'],
    });
  },
}));
