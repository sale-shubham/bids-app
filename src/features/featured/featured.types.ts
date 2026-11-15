export type FeatureDays = 1 | 3 | 7;
export const FEATURE_DAYS: FeatureDays[] = [1, 3, 7];

export interface FeaturePurchase {
  id: string;
  days: number;
  amountPaise: number;
  status: string;
  /** `RAZORPAY` or `CREDITS`. */
  paidWith: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AuctionFeature {
  featuredUntil: string | null;
  purchases: FeaturePurchase[];
}

/** `POST /auctions/:id/feature/checkout` answered by spending credits. */
export interface FeatureCreditsResult {
  paidWithCredits: true;
  featuredUntil: string | null;
}
