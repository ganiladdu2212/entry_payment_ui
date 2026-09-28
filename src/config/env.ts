const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl && process.env.NODE_ENV !== 'test') console.warn('EXPO_PUBLIC_API_URL is not configured; using local API URL.');
export const env = { apiUrl: apiUrl ?? 'http://localhost:8080/entry-payment' } as const;
