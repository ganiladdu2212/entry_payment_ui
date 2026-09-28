import { apiClient } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api';
export async function getHealth() { return (await apiClient.get<ApiResponse<string>>('/api/v1/health')).data; }
