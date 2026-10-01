import { create } from 'zustand';
import { themeStorage } from '@/storage/themeStorage';

export type ThemeMode = 'dark' | 'light';

type ThemeState = {
  mode: ThemeMode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  hydrated: false,
  hydrate: async () => {
    const saved = await themeStorage.get();
    set({ mode: saved === 'light' ? 'light' : 'dark', hydrated: true });
  },
  setMode: async (mode) => {
    set({ mode });
    await themeStorage.set(mode);
  },
}));
