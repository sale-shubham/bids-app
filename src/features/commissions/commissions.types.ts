export type CommissionStatus = 'DUE' | 'PAID' | 'WAIVED';
export type CommissionTab = 'due' | 'paid' | 'waived' | 'all';

export interface CommissionDTO {
  id: string;
  auctionId: string;
  auction: {
    id: string;
    title: string;
    coverImage: string | null;
    finalBidPaise: number;
    endedAt: string | null;
  };
  rateBps: number;
  amountPaise: number;
  status: CommissionStatus;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  isOverdue: boolean;
}

export interface CommissionSummary {
  unpaidPaise: number;
  dueCount: number;
  overdueCount: number;
}

export interface CheckoutPayload {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
}
