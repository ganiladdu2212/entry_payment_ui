import { AxiosError } from 'axios';
import { apiClient } from '@/lib/apiClient';
import type { ActorType, Branch } from '@/features/auth/authApi';

type ApiResponse<T> = { status: boolean; message: string; data: T };
export const employeePermissions = ['MEMBER_VIEW','MEMBER_REGISTER','MEMBER_EDIT','PAYMENT_VIEW','PAYMENT_RECORD','ATTENDANCE_VIEW','ATTENDANCE_MANAGE','PLAN_VIEW','PLAN_MANAGE','HOLIDAY_VIEW','HOLIDAY_MANAGE','EMPLOYEE_VIEW','EMPLOYEE_MANAGE','BRANCH_SETTINGS'] as const;
export interface EmployeeCategory { categoryId: number; branchId: number; name: string; description: string | null; permissions: string[]; active: boolean }
export interface Employee { employeeId: number; branchId: number; branchName: string; name: string; mobileNumber: string; role: Exclude<ActorType,'OWNER'>; categoryId: number | null; categoryName: string | null; permissions: string[]; active: boolean; mustChangePassword: boolean; createdDate: string }
export interface EmployeeCreated { employee: Employee; temporaryPassword: string; whatsappMessage: string; whatsappUrl: string }

async function call<T>(work: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try { const { data } = await work; if (!data.status) throw new Error(data.message); return data.data; }
  catch (error) { if (error instanceof AxiosError) throw new Error(error.response?.data?.message || 'Unable to complete the request.'); throw error; }
}
export const getBranches = () => call<Branch[]>(apiClient.get('/api/v1/branches'));
export const createBranch = (body: { name: string; facilityType: string; address?: string; mobileNumber?: string }) => call<Branch>(apiClient.post('/api/v1/branches', body));
export const getCategories = (branchId: number) => call<EmployeeCategory[]>(apiClient.get(`/api/v1/branches/${branchId}/categories`));
export const createCategory = (branchId: number, body: { name: string; description?: string; permissions: string[] }) => call<EmployeeCategory>(apiClient.post(`/api/v1/branches/${branchId}/categories`, body));
export const getEmployees = (branchId: number) => call<Employee[]>(apiClient.get(`/api/v1/branches/${branchId}/employees`));
export const createEmployee = (branchId: number, body: { name: string; mobileNumber: string; role: 'BRANCH_ADMIN'|'EMPLOYEE'; categoryId?: number; permissions: string[]; loginUrl: string }) => call<EmployeeCreated>(apiClient.post(`/api/v1/branches/${branchId}/employees`, body));
