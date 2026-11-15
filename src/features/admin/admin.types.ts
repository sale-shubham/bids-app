import type { CheckoutMode } from '@/features/settings/settings.types';
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
  /** Verified-seller badge (revocable by an admin). */
  verified: boolean;
  phoneVerifiedAt: string | null;
  twoFactorEnabled: boolean;
  /** Seller payout account status; null when the member has none. */
  payoutStatus: string | null;
  /** Unpaid-purchase strikes still in force (not removed, not expired). */
  activeStrikes: number;
  /** Credit balance (referral rewards etc.) in paise. */
  creditBalancePaise: number;
}

export type MemberStatusFilter = '' | 'active' | 'inactive';
export type MemberRoleFilter = '' | Role;
export interface MemberFilters {
  q: string;
  role: MemberRoleFilter;
  status: MemberStatusFilter;
}

export type AdminAuctionTab = 'live' | 'upcoming' | 'ended' | 'cancelled' | 'all';
export type AdminAuction = AuctionCard & { sellerEmail: string; /** Bid deposit in paise; null/absent = none. */ depositPaise?: number | null };

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
  /** Read-only, derived from the category tree (managed at /admin/categories); the API ignores it on save. */
  categories?: string[];
  /** Platform maximum price in paise (100_000 .. 1_000_000_000_000). */
  maxPricePaise: number;
  /** Winner checkout through the platform: off / optional / required. */
  checkoutMode: CheckoutMode;
  /** Starting bid from which an auction needs a bid deposit (paise); 0 = off. */
  depositThresholdPaise: number;
  /** Deposit as a share of the starting bid, in basis points (100 .. 5000). */
  depositRateBps: number;
  /** Paid featured listings on? Optional so an older API response still parses. */
  featuredEnabled?: boolean;
  /** Price in paise per promotion length: keys `1`, `3`, `7`. */
  featuredPrices?: Record<string, number>;
}

export type LegalSlug = 'terms-conditions' | 'privacy-policy' | 'refund-policy' | 'prohibited-items';
export interface LegalPage {
  slug: LegalSlug;
  title: string;
  content: string;
  updatedAt: string | null;
}
