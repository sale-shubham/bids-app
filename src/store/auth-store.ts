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
  // Trust (Phase D). Optional: login / older responses may omit them until `['me']` refetches.
  /** Verified-seller badge: the member has a KYC'd (ACTIVE) payout account. */
  verified?: boolean;
  /** Unpaid-purchase strikes in force (Phase E). */
  activeStrikes?: number;
  /** Billing details for GST invoices (Phase G). */
  gstin?: string | null;
  billingState?: string | null;
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
