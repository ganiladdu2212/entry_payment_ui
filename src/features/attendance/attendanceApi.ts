import { AxiosError } from 'axios';
import { apiClient } from '@/lib/apiClient';

type ApiResponse<T> = { status: boolean; statusCode: number; message: string; data: T };
export type AttendanceEvent = {
  attendanceEventId: number;
  custId: number;
  userId: number;
  userName: string;
  mobileNumber: string;
  deviceUniqueId: string;
  actionType: 'CHECK_IN' | 'CHECK_OUT';
  createdDate: string;
};

export async function getCheckInCheckOut(userId: number): Promise<AttendanceEvent[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<AttendanceEvent[]>>('/api/v1/attendance/getCheckInCheckOut', { params: { userId } });
    if (!data.status || !Array.isArray(data.data)) throw new Error(data.message || 'Unable to load attendance.');
    return data.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error((error.response?.data as { message?: string } | undefined)?.message || 'Unable to load attendance.');
    }
    throw error;
  }
}
