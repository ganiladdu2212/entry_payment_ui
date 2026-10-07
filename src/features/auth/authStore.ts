import { create } from 'zustand';
import type { ActorType, Branch, Customer, LoginData } from './authApi';
interface AuthState {
  customer: Customer | null; displayName: string | null; employeeId: number | null; actorType: ActorType | null;
  branch: Branch | null; permissions: string[]; mustChangePassword: boolean;
  setSession: (login: LoginData) => void; setCustomer: (customer: Customer) => void; setBranch: (branch: Branch | null) => void; clear: () => void;
}
const empty = { customer: null, displayName: null, employeeId: null, actorType: null, branch: null, permissions: [], mustChangePassword: false };
export const useAuthStore = create<AuthState>((set) => ({ ...empty,
  setSession: (login) => set({ customer: login.customer, displayName: login.displayName, employeeId: login.employeeId, actorType: login.actorType, branch: login.branch, permissions: login.permissions, mustChangePassword: login.mustChangePassword }),
  setCustomer: (customer) => set({ customer }), setBranch: (branch) => set({ branch }), clear: () => set(empty),
}));
