import type { AuctionCard } from '@/features/auctions/auctions.types';
import type { CommissionDTO } from '@/features/commissions/commissions.types';
import type { Role } from '@/constants/routes';

export interface AdminTotals {
  members: number;
  bidders: number;
  auctioneers: number;
  liveAuctions: number;
  upcomingAuctions: number;
  endedAuctions: number;
  bidsToday: number;
  commissionPaidPaise: number;
  commissionDuePaise: number;
}

export interface AdminDashboard {
  totals: AdminTotals;
  revenueByMonth: { month: string; paidPaise: number }[];
  signupsByMonth: { month: string; bidders: number; auctioneers: number }[];
  recentAuctions: AuctionCard[];
}

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  unpaidCommissionPaise: number;
  auctionsWon: number;
  moneySpentPaise: number;
}

export type MemberStatusFilter = '' | 'active' | 'inactive';
export type MemberRoleFilter = '' | Role;
export interface MemberFilters {
  q: string;
  role: MemberRoleFilter;
  status: MemberStatusFilter;
}

export type AdminAuctionTab = 'live' | 'upcoming' | 'ended' | 'cancelled' | 'all';
export type AdminAuction = AuctionCard & { sellerEmail: string };

export type AdminCommissionTab = 'due' | 'paid' | 'waived' | 'all';
export type AdminCommission = CommissionDTO & { seller: { id: string; name: string; email: string } };

export type PaymentStatus = 'created' | 'paid' | 'failed';
export type AdminPaymentTab = PaymentStatus | 'all';
export interface AdminPayment {
  id: string;
  member: { id: string; name: string; email: string };
  amountPaise: number;
  status: PaymentStatus;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface AdminSettings {
  commissionRateBps: number;
  minIncrementPaise: number;
  antiSnipingMinutes: number;
  categories: string[];
  /** Platform maximum price in paise (100_000 .. 1_000_000_000_000). */
  maxPricePaise: number;
}

export type LegalSlug = 'terms-conditions' | 'privacy-policy' | 'refund-policy';
export interface LegalPage {
  slug: LegalSlug;
  title: string;
  content: string;
  updatedAt: string | null;
}
