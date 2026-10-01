import * as SecureStore from 'expo-secure-store';
const KEY = 'entry-payment-attendance-device-id';
const create = () => `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export const deviceIdStorage = {
  getOrCreate: async () => {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) return existing;
    const value = create();
    await SecureStore.setItemAsync(KEY, value);
    return value;
  },
};
