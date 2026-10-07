import { AxiosError } from 'axios';
import { env } from '@/config/env';
import { apiClient } from '@/lib/apiClient';
import type { CustomerSubscription } from './subscriptionApi';
import { normalizePaymentStatus, type PaymentStatus } from './paymentStatus';

export type SaveUserRequest = {
  typeOfMode: 'CREATE' | 'UPDATE'; userId?: number; custId: number;
  name: string; mobileNumber: string; countryCode: string;
  membershipSubscriptionId: number | null; personalTrainingSubscriptionId: number | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'; discountValue: number; paymentMode: string;
  paymentStatus: PaymentStatus;
};
export type SavedUser = {
  userId: number; custId: number; name: string; mobileNumber: string; countryCode: string; createdDate: string;
  subscription: {
    subscriptionId: number; discountType: string; discountValue: number; paymentMode: string; createdDate: string;
    paymentStatus: PaymentStatus | null;
    membershipPlan: CustomerSubscription | null; trainingPlan: CustomerSubscription | null;
  };
};
export type PaymentReceiptResult = {
  paymentReceiptId: number; userId: number; subscriptionId: number; expectedAmount: number;
  capturedAmount: number; transactionReference: string; receiverUpiId: string | null;
  paymentApp: string; paymentDate: string; verificationMode: string; receiptImageUrl: string;
  paymentStatus: PaymentStatus; createdDate: string;
};
export async function saveUserSubscriptions(request: SaveUserRequest): Promise<SavedUser> {
  try {
    const { data } = await apiClient.post<{ status: boolean; message: string; data: SavedUser }>(
      '/api/v1/users/saveUserSubscriptions', request,
    );
    if (!data.status || !data.data?.userId || !data.data.subscription?.subscriptionId) {
      throw new Error(data.message || 'The server did not confirm the subscription was saved.');
    }
    return { ...data.data, subscription: { ...data.data.subscription, paymentStatus: normalizePaymentStatus(data.data.subscription.paymentStatus) } };
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message ||
        (error.response ? 'Unable to save subscription.' : 'Save confirmation was not received. Check the saved records before retrying.'));
    }
    throw error;
  }
}

export async function getUsersByCustomer(custId: number): Promise<SavedUser[]> {
  try {
    const { data } = await apiClient.get<{ status: boolean; message: string; data: SavedUser[] }>(`/api/v1/users/getUser/${custId}`);
    if (!data.status || !Array.isArray(data.data)) throw new Error(data.message || 'Unable to load customers.');
    return data.data.map(user => ({ ...user, subscription: { ...user.subscription, paymentStatus: normalizePaymentStatus(user.subscription.paymentStatus) } }));
  } catch (error) {
    if (error instanceof AxiosError) throw new Error(error.response?.data?.message || 'Unable to load customers. Please retry.');
    throw error;
  }
}

export async function getUserSubscription(userId: number): Promise<SavedUser> {
  const { data } = await apiClient.get<{ status: boolean; message: string; data: SavedUser }>(`/api/v1/users/getUserSubscription/${userId}`);
  if (!data.status || !data.data?.subscription) throw new Error(data.message || 'Unable to load customer.');
  return { ...data.data, subscription: { ...data.data.subscription, paymentStatus: normalizePaymentStatus(data.data.subscription.paymentStatus) } };
}

export async function verifyPaymentReceipt(userId: number, uri: string, mimeType = 'image/jpeg'): Promise<PaymentReceiptResult> {
  const body = new FormData();
  if (typeof window !== 'undefined') {
    const blob = await fetch(uri).then(response => response.blob());
    body.append('image', blob, `payment-receipt.${mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'}`);
  } else {
    body.append('image', { uri, type: mimeType, name: 'payment-receipt.jpg' } as unknown as Blob);
  }
  try {
    const { data } = await apiClient.post<{ status: boolean; message: string; data: PaymentReceiptResult }>(
      `/api/v1/users/${userId}/payments/verify-receipt`, body,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 },
    );
    if (!data.status || !data.data?.paymentReceiptId) throw new Error(data.message || 'Receipt verification failed.');
    return data.data;
  } catch (error) {
    if (error instanceof AxiosError) throw new Error(error.response?.data?.message || 'Unable to verify payment receipt.');
    throw error;
  }
}

export function subscriptionWhatsAppUrl(user: SavedUser, orgName: string): string {
  const s = user.subscription;
  const plans = [s.membershipPlan, s.trainingPlan].filter((p): p is CustomerSubscription => p !== null);
  const currency = plans[0]?.currency ?? 'INR';
  // Preserve the existing application's catalog amount convention.
  const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  const total = plans.reduce((sum, plan) => sum + plan.basePriceMinor, 0);
  const reduction = s.discountType === 'PERCENTAGE'
    ? Math.round(total * Math.min(s.discountValue, 100) / 100)
    : Math.min(s.discountValue, total);
  const amount = Math.max(0, total - reduction);
  const transactionReference = `EP${user.userId}${Date.now()}`.slice(0, 35);
  const paymentParameters = [
    ['pa', env.upiId],
    ['pn', env.upiPayeeName],
    ['tr', transactionReference],
    ['tn', 'Entry payment'],
    ['am', amount.toFixed(2)],
    ['cu', 'INR'],
    ['mc', '0000'],
    ['mode', '02'],
    ['purpose', '00'],
  ].map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&');
  const paymentLink = `upi://pay?${paymentParameters}`;
  const message = [
    'Hello ' + user.name, '',
    'Welcome to ' + orgName, '',
    'Your registration is completed.',
    'and your selected plan: ' + plans.map(plan => plan.planName).join(' + ') + ' Amount: ' + money(total) + ' Discount: ' + money(reduction), '',
    'Payment Link:', paymentLink, '',
    'Note: after payment show receipt to us.', '',
    'Thankyou!', 'Entry Payment',
  ].join('\n');
  const phone = (user.countryCode + user.mobileNumber).replace(/\D/g, '');
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
}
