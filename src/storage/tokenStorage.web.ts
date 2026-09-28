const KEY = 'entry-payment-auth-token';
export const tokenStorage = {
  get: async () => globalThis.localStorage?.getItem(KEY) ?? null,
  set: async (token: string) => { globalThis.localStorage?.setItem(KEY, token); },
  remove: async () => { globalThis.localStorage?.removeItem(KEY); },
};
