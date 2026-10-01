import { useMutation } from '@tanstack/react-query';
import { tokenStorage } from '@/storage/tokenStorage';
import { loginCustomer } from './authApi';
import { useAuthStore } from './authStore';
interface LoginVariables { identifier: string; password: string; rememberMe: boolean }
export function useCustomerLogin() {
  const setCustomer = useAuthStore((state) => state.setCustomer);
  return useMutation({ mutationFn: ({ identifier, password }: LoginVariables) => loginCustomer(identifier, password), onSuccess: async (data, variables) => { await tokenStorage.set(data.accessToken, data.refreshToken, variables.rememberMe); setCustomer(data.customer); } });
}
