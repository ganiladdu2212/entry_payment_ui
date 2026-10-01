import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'entry-payment-theme';

export const themeStorage = {
  get: () => SecureStore.getItemAsync(THEME_KEY),
  set: (value: 'dark' | 'light') => SecureStore.setItemAsync(THEME_KEY, value),
};
