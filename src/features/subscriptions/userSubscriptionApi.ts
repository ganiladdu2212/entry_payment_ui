import { AxiosError } from 'axios';
import { apiClient } from '@/lib/apiClient';
import type { CustomerSubscription } from './subscriptionApi';
import { normalizePaymentStatus, paymentStatusLabels, type PaymentStatus } from './paymentStatus';

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

export function subscriptionWhatsAppUrl(user: SavedUser): string {
  const s = user.subscription;
  const plans = [s.membershipPlan, s.trainingPlan].filter((p): p is CustomerSubscription => p !== null);
  const currency = plans[0]?.currency ?? 'INR';
  // Preserve the existing application's catalog amount convention.
  const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  const total = plans.reduce((sum, plan) => sum + plan.basePriceMinor, 0);
  const reduction = s.discountType === 'PERCENTAGE'
    ? Math.round(total * Math.min(s.discountValue, 100) / 100)
    : Math.min(s.discountValue, total);
  const planDetails = (title: string, plan: CustomerSubscription | null) => plan
    ? [title + ': ' + plan.planName, 'Plan ID: ' + plan.subscriptionId,
      'Duration: ' + plan.durationUnit + ' (' + plan.durationValue + ')',
      'Price: ' + money(plan.basePriceMinor),
      'Plan savings: ' + money(plan.savingsMinor) + ' (' + plan.savingsPercentage + '%)'].join('\n')
    : title + ': Not selected';
  const message = [
    'Subscription confirmation', 'Name: ' + user.name,
    'Phone: ' + user.countryCode + ' ' + user.mobileNumber,
    'Member ID: ' + user.userId, 'Subscription ID: ' + s.subscriptionId, '',
    planDetails('Membership', s.membershipPlan), '', planDetails('Personal Training', s.trainingPlan), '',
    'Subtotal: ' + money(total),
    'Discount: ' + (s.discountType === 'PERCENTAGE' ? s.discountValue + '%' : money(s.discountValue)),
    'Discount amount: ' + money(reduction), 'Final amount: ' + money(Math.max(0, total - reduction)),
    'Payment mode: ' + s.paymentMode, 'Payment status: ' + (s.paymentStatus ? paymentStatusLabels[s.paymentStatus] : 'Not recorded'), 'Created (Asia/Kolkata): ' + s.createdDate,
  ].join('\n');
  const phone = (user.countryCode + user.mobileNumber).replace(/\D/g, '');
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
}
