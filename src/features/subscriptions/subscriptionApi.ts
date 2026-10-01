import { AxiosError } from 'axios';
import { apiClient } from '@/lib/apiClient';

type CustomerApiResponse<T> = { status: boolean; statusCode: number; message: string; data: T };

export type CustomerSubscription = {
  subscriptionId: number;
  custId: number;
  active: boolean;
  basePriceMinor: number;
  savingsMinor: number;
  savingsPercentage: number;
  currency: string;
  durationUnit: string;
  durationValue: number;
  planName: string;
  typeOfPlan: string;
  createdDate: string;
};

export type SaveCustomerSubscription = {
  custId: number;
  active: boolean;
  basePriceMinor: number;
  currency: string;
  durationUnit: string;
  durationValue: number;
  planName: string;
  typeOfPlan: 'MEMBERSHIP' | 'PERSONAL_TRAINING';
};

export function formatSubscriptionDuration(durationUnit: string, durationValue: number) {
  const unit = durationUnit.trim().toUpperCase();
  const label = unit === 'DAY' ? 'day' : unit === 'WEEK' ? 'week' : unit === 'YEAR' ? 'year' : 'month';
  return `${durationValue} ${label}${durationValue === 1 ? '' : 's'}`;
}

// Compare calendar durations from the same registration day (India time).
export function trainingExceedsMembership(membership: CustomerSubscription | undefined, training: CustomerSubscription | undefined): boolean {
  if (!training) return false;
  if (!membership) return true;
  const indiaToday = new Date(Date.now() + 330 * 60_000);
  const start = new Date(Date.UTC(indiaToday.getUTCFullYear(), indiaToday.getUTCMonth(), indiaToday.getUTCDate()));
  const end = (plan: CustomerSubscription) => {
    const date = new Date(start);
    const unit = plan.durationUnit.trim().replace(/[-_ ]/g, '').toUpperCase();
    if (['DAY', 'DAILY', 'DAYS', 'WEEK', 'WEEKLY', 'WEEKS'].includes(unit)) {
      date.setUTCDate(date.getUTCDate() + plan.durationValue * (['WEEK', 'WEEKLY', 'WEEKS'].includes(unit) ? 7 : 1));
    } else {
      const day = date.getUTCDate();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + plan.durationValue * (unit === 'YEAR' || unit === 'YEARS' ? 12 : 1));
      const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
      date.setUTCDate(Math.min(day, lastDay));
    }
    return date.getTime();
  };
  return end(training) > end(membership);
}

export async function getCustomerSubscriptions(custId: number): Promise<CustomerSubscription[]> {
  try {
    const response = await apiClient.get<CustomerApiResponse<CustomerSubscription[]>>(
      `/api/v1/customers/subscriptions/getCustSubscriptions/${custId}`,
    );
    return response.data.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const message = (error.response?.data as { message?: string } | undefined)?.message;
      throw new Error(message || 'Unable to load subscription plans.');
    }
    throw new Error('Unable to load subscription plans.');
  }
}

async function saveCustomerSubscription(path: string, request: SaveCustomerSubscription, update: boolean): Promise<CustomerSubscription> {
  try {
    const response = update
      ? await apiClient.put<CustomerApiResponse<CustomerSubscription>>(path, request)
      : await apiClient.post<CustomerApiResponse<CustomerSubscription>>(path, request);
    return response.data.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const message = (error.response?.data as { message?: string } | undefined)?.message;
      throw new Error(message || `Unable to ${update ? 'update' : 'create'} subscription plan.`);
    }
    throw new Error(`Unable to ${update ? 'update' : 'create'} subscription plan.`);
  }
}

export function createCustomerSubscription(request: SaveCustomerSubscription) {
  return saveCustomerSubscription('/api/v1/customers/subscriptions/createCustSubscription', request, false);
}

export function updateCustomerSubscription(subscriptionId: number, request: SaveCustomerSubscription) {
  return saveCustomerSubscription(`/api/v1/customers/subscriptions/updateCustSubscription/${subscriptionId}`, request, true);
}

export async function deleteCustomerSubscription(subscriptionId: number): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/customers/subscriptions/deleteCustSubscription/${subscriptionId}`);
  } catch (error) {
    if (error instanceof AxiosError) {
      const message = (error.response?.data as { message?: string } | undefined)?.message;
      throw new Error(message || 'Unable to delete subscription plan.');
    }
    throw new Error('Unable to delete subscription plan.');
  }
}
