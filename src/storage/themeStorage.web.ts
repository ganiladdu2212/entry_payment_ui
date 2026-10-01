const THEME_KEY = 'entry-payment-theme';

export const themeStorage = {
  get: async () => globalThis.localStorage?.getItem(THEME_KEY) ?? null,
  set: async (value: 'dark' | 'light') => globalThis.localStorage?.setItem(THEME_KEY, value),
};
