export interface ReferralSummary {
  code: string;
  link: string;
  rewardPaise: number;
  enabled: boolean;
  counts: { pending: number; qualified: number; rewarded: number; rejected: number };
  creditBalancePaise: number;
}

export type CreditReason = 'REFERRAL_REWARD' | 'FEATURE_PURCHASE' | 'COMMISSION_PAYMENT' | 'ADMIN_ADJUSTMENT';

export interface CreditEntry {
  id: string;
  /** Positive = credited, negative = spent. */
  amountPaise: number;
  reason: CreditReason | string;
  note: string | null;
  createdAt: string;
}

export const CREDIT_REASON_LABEL: Record<string, string> = {
  REFERRAL_REWARD: 'Referral reward',
  FEATURE_PURCHASE: 'Promotion',
  COMMISSION_PAYMENT: 'Commission payment',
  ADMIN_ADJUSTMENT: 'Adjustment by NobleBid',
};
