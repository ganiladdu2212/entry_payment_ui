import { AxiosError } from 'axios';
import { apiClient } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api';

export interface Customer { custId: number; name: string | null; orgName: string | null; logo: string | null; mobileNumber: string | null; email: string | null; createdDate: string }
export interface LoginData { customer: Customer; accessToken: string; refreshToken: string; tokenType: 'Bearer'; expiresIn: number }
interface LoginRequest { mobileNumber?: string; email?: string; pwd: string }

export async function loginCustomer(identifier: string, password: string): Promise<LoginData> {
  const loginRequest: LoginRequest = identifier.includes('@') ? { email: identifier, pwd: password } : { mobileNumber: identifier, pwd: password };
  try {
    const response = await apiClient.post<ApiResponse<LoginData>>('/api/v1/customers/loginCustomer', loginRequest);
    return response.data.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const message = (error.response?.data as { message?: string } | undefined)?.message;
      if (message) throw new Error(message);
      if (!error.response) throw new Error('Unable to reach the server. Check your connection and API address.');
    }
    throw new Error('Login failed. Please try again.');
  }
}
