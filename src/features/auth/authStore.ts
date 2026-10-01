import { create } from 'zustand';
import type { Customer } from './authApi';
interface AuthState { customer: Customer | null; setCustomer: (customer: Customer) => void; clear: () => void }
export const useAuthStore = create<AuthState>((set) => ({ customer: null, setCustomer: (customer) => set({ customer }), clear: () => set({ customer: null }) }));
