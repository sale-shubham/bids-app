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
  phoneVerifiedAt?: string | null;
  twoFactorEnabled?: boolean;
  /** Verified-seller badge. */
  verified?: boolean;
  /** SUPER_ADMIN only: the server requires admin 2FA and it is not set up yet. */
  twoFactorSetupRequired?: boolean;
  /** Opted in to WhatsApp alerts (needs a verified phone). */
  whatsappOptIn?: boolean;
  /** Raw timestamp login / signup-verify responses carry instead of `whatsappOptIn`. */
  whatsappOptInAt?: string | null;
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

/** Opt-in flag for a member from any response shape: `GET /members/me` has the boolean, login / signup-verify only `whatsappOptInAt`. */
export function isWhatsappOptedIn(m: Pick<AuthMember, 'whatsappOptIn' | 'whatsappOptInAt'> | null | undefined): boolean {
  if (!m) return false;
  return m.whatsappOptIn ?? !!m.whatsappOptInAt;
}
