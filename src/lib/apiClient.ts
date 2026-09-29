import { create } from 'axios';
import { env } from '@/config/env';
import { tokenStorage } from '@/storage/tokenStorage';

export const apiClient = create({ baseURL: env.apiUrl, timeout: 15_000, headers: { 'Content-Type': 'application/json' } });
apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
