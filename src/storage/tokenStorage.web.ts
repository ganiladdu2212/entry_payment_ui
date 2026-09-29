const ACCESS_KEY = 'entry-payment-access-token'; const REFRESH_KEY = 'entry-payment-refresh-token';
export const tokenStorage = {
  get: async () => globalThis.sessionStorage?.getItem(ACCESS_KEY) ?? globalThis.localStorage?.getItem(ACCESS_KEY) ?? null,
  getRefresh: async () => globalThis.sessionStorage?.getItem(REFRESH_KEY) ?? globalThis.localStorage?.getItem(REFRESH_KEY) ?? null,
  set: async (accessToken: string, refreshToken: string, remember: boolean) => { const selected = remember ? globalThis.localStorage : globalThis.sessionStorage; const other = remember ? globalThis.sessionStorage : globalThis.localStorage; other?.removeItem(ACCESS_KEY); other?.removeItem(REFRESH_KEY); selected?.setItem(ACCESS_KEY, accessToken); selected?.setItem(REFRESH_KEY, refreshToken); },
  remove: async () => { for (const storage of [globalThis.localStorage, globalThis.sessionStorage]) { storage?.removeItem(ACCESS_KEY); storage?.removeItem(REFRESH_KEY); } },
};
