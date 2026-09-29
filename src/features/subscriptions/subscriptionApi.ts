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
