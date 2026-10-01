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

export type CheckInCheckOutResult = {
  attendanceEventId: number;
  userId: number;
  name: string;
  mobileNumber: string;
  actionType: 'CHECK_IN' | 'CHECK_OUT';
  eventTime: string;
  nextAction: 'CHECK_IN' | 'CHECK_OUT';
  deviceRegistered: boolean;
};

export class AttendanceApiError extends Error {
  constructor(message: string, readonly statusCode?: number) { super(message); }
}

export async function checkInCheckOut(request: { custId: number; deviceUniqueId: string; mobileNumber?: string; pin?: string }): Promise<CheckInCheckOutResult> {
  try {
    const { data } = await apiClient.post<ApiResponse<CheckInCheckOutResult>>('/api/v1/public/attendance/checkInCheckOut', request);
    if (!data.status || !data.data) throw new AttendanceApiError(data.message || 'Unable to record attendance.', data.statusCode);
    return data.data;
  } catch (error) {
    if (error instanceof AttendanceApiError) throw error;
    if (error instanceof AxiosError) {
      const response = error.response?.data as { message?: string; statusCode?: number } | undefined;
      throw new AttendanceApiError(response?.message || (error.response ? 'Unable to record attendance.' : 'Unable to reach the attendance server.'), response?.statusCode ?? error.response?.status);
    }
    throw error;
  }
}

export async function getCheckInCheckOut(userId?: number): Promise<AttendanceEvent[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<AttendanceEvent[]>>('/api/v1/attendance/getCheckInCheckOut', { params: userId ? { userId } : undefined });
    if (!data.status || !Array.isArray(data.data)) throw new Error(data.message || 'Unable to load attendance.');
    return data.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error((error.response?.data as { message?: string } | undefined)?.message || 'Unable to load attendance.');
    }
    throw error;
  }
}
