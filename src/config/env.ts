import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
const webUrl = process.env.EXPO_PUBLIC_WEB_URL;
const upiId = process.env.EXPO_PUBLIC_UPI_ID;
const upiPayeeName = process.env.EXPO_PUBLIC_UPI_PAYEE_NAME;

const browserHostname =
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : undefined;

// On web, call the API through the same machine name/IP used to open the UI.
// This supports localhost, LAN access, and the public static IP without requiring
// NAT loopback support from the router. Native builds continue using .env.
const apiUrl = browserHostname
  ? `http://${browserHostname}:8080/entry-payment`
  : configuredApiUrl;

if (!apiUrl && process.env.NODE_ENV !== 'test')
  console.warn('EXPO_PUBLIC_API_URL is not configured; using local API URL.');
export const env = {
  apiUrl: apiUrl ?? 'http://localhost:8080/entry-payment',
  webUrl: (webUrl ?? 'http://localhost:8081').replace(/\/$/, ''),
  upiId: upiId ?? '7601049866@ibl',
  upiPayeeName: upiPayeeName ?? 'VANAM SAMATHA',
} as const;
