const KEY = 'entry-payment-attendance-device-id';
const create = () => `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export const deviceIdStorage = {
  getOrCreate: async () => {
    const existing = globalThis.localStorage?.getItem(KEY);
    if (existing) return existing;
    const value = create();
    globalThis.localStorage?.setItem(KEY, value);
    return value;
  },
};
