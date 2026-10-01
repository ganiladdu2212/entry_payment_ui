import { AxiosError } from 'axios';
import { apiClient } from '@/lib/apiClient';

type ApiResponse<T> = { status: boolean; statusCode: number; message: string; data: T };
export type GymHoliday = { holidayId: number; custId: number; holidayDate: string; purpose: string; createdDate: string };

const message = (error: unknown, fallback: string) => error instanceof AxiosError
  ? ((error.response?.data as { message?: string } | undefined)?.message || fallback) : fallback;

export async function getGymHolidays(custId: number): Promise<GymHoliday[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<GymHoliday[]>>(`/api/v1/customers/holidays/${custId}`);
    if (!data.status || !Array.isArray(data.data)) throw new Error(data.message || 'Unable to load gym holidays.');
    return data.data;
  } catch (error) { if (error instanceof Error && !(error instanceof AxiosError)) throw error; throw new Error(message(error,'Unable to load gym holidays.')); }
}
export async function createGymHoliday(request: { custId: number; holidayDate: string; purpose: string }): Promise<GymHoliday> {
  try {
    const { data } = await apiClient.post<ApiResponse<GymHoliday>>('/api/v1/customers/holidays',request);
    if (!data.status || !data.data) throw new Error(data.message || 'Unable to create gym holiday.');
    return data.data;
  } catch (error) { if (error instanceof Error && !(error instanceof AxiosError)) throw error; throw new Error(message(error,'Unable to create gym holiday.')); }
}
export async function deleteGymHoliday(holidayId: number): Promise<void> {
  try { await apiClient.delete(`/api/v1/customers/holidays/${holidayId}`); }
  catch (error) { throw new Error(message(error,'Unable to delete gym holiday.')); }
}
