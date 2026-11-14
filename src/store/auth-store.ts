import { create } from "zustand";

import type { Role } from "@/constants/routes";

export type { Role };

// Who is logged in. Login is email + password; email OTP is only used for
// signup verification and forgot-password.
export interface AuthMember {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  // Only on GET /members/me — "Member since" on the Profile page.
  createdAt?: string;
  // Only on GET /members/me — this account's device/session cap. The Profile
  // page shows its Devices tab only when it is above 1.
  deviceLimit?: number;
}

interface AuthState {
  member: AuthMember | null;
  initialized: boolean;
  setMember: (m: AuthMember | null) => void;
  setInitialized: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  member: null,
  initialized: false,
  setMember: (member) => set({ member }),
  setInitialized: (initialized) => set({ initialized }),
  clear: () => set({ member: null }),
}));
