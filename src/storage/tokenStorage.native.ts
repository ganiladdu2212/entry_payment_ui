import * as SecureStore from 'expo-secure-store';
const ACCESS_KEY = 'entry-payment-access-token'; const REFRESH_KEY = 'entry-payment-refresh-token';
let sessionAccessToken: string | null = null; let sessionRefreshToken: string | null = null;
export const tokenStorage = {
  get: async () => sessionAccessToken ?? SecureStore.getItemAsync(ACCESS_KEY),
  getRefresh: async () => sessionRefreshToken ?? SecureStore.getItemAsync(REFRESH_KEY),
  set: async (accessToken: string, refreshToken: string, remember: boolean) => { sessionAccessToken = accessToken; sessionRefreshToken = refreshToken; if (remember) await Promise.all([SecureStore.setItemAsync(ACCESS_KEY, accessToken), SecureStore.setItemAsync(REFRESH_KEY, refreshToken)]); else await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]); },
  remove: async () => { sessionAccessToken = null; sessionRefreshToken = null; await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]); },
};
