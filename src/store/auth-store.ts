import { create } from "zustand";

import type { Role } from "@/constants/routes";

export type { Role };

// Who is logged in: the `GET /members/me` shape. Login / verify responses may
// carry a subset; AuthBootstrap refetches `['me']` to fill in the rest.
export interface AuthMember {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  address: string | null;
  role: Role;
  isActive: boolean;
  emailVerifiedAt: string | null;
  unpaidCommissionPaise: number;
  auctionsWon: number;
  moneySpentPaise: number;
  createdAt: string;
  // This account's concurrent-session cap.
  deviceLimit: number;
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
