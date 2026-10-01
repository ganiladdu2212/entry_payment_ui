export const paymentStatuses = ['RECEIVED', 'PENDING', 'NOT_ONBOARDED'] as const;
export type PaymentStatus = typeof paymentStatuses[number];
// Runtime API/database values are not guaranteed by TypeScript's declared type.
export function normalizePaymentStatus(value: unknown): PaymentStatus | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'PAID' || normalized === 'RECEVED' || normalized === 'RECIVED') return 'RECEIVED';
  if (normalized === 'NOTONBOARDED') return 'NOT_ONBOARDED';
  return paymentStatuses.find(status => status === normalized) ?? null;
}
export const paymentStatusLabels: Record<PaymentStatus, string> = {
  RECEIVED: 'Received', PENDING: 'Pending', NOT_ONBOARDED: 'Not Onboarded',
};
