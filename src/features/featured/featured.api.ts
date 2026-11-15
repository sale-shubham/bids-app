import { api } from '@/lib/api-client';
import { parseCheckout } from '@/features/commissions/commissions.parse';
import { parseCardList } from '@/features/auctions/auctions.parse';
import type { CheckoutPayload } from '@/features/payments/payments.types';
import type { AuctionFeature, FeatureCreditsResult, FeatureDays, FeaturePurchase } from './featured.types';

const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export const FEATURE_PROMOTED_LIMIT = 2;

/** Owner only: current promotion end and purchase history. */
export async function fetchAuctionFeature(auctionId: string): Promise<AuctionFeature> {
  const res = await api.get(`/auctions/${encodeURIComponent(auctionId)}/feature`);
  const d = obj(res.data?.data);
  const purchases = Array.isArray(d.purchases) ? d.purchases : [];
  return {
    featuredUntil: str(d.featuredUntil),
    purchases: purchases.map((p): FeaturePurchase => {
      const o = obj(p);
      return {
        id: String(o.id ?? ''),
        days: num(o.days),
        amountPaise: num(o.amountPaise),
        status: String(o.status ?? ''),
        paidWith: str(o.paidWith),
        paidAt: str(o.paidAt),
        createdAt: String(o.createdAt ?? ''),
      };
    }),
  };
}

/** Paying with credits answers `{ paidWithCredits: true }`; otherwise the standard Razorpay checkout payload. */
export async function createFeatureCheckout(
  auctionId: string,
  input: { days: FeatureDays; useCredits?: boolean },
): Promise<FeatureCreditsResult | CheckoutPayload> {
  const res = await api.post(`/auctions/${encodeURIComponent(auctionId)}/feature/checkout`, input);
  const d = obj(res.data?.data);
  if (d.paidWithCredits === true) return { paidWithCredits: true, featuredUntil: str(d.featuredUntil) };
  return parseCheckout(res.data);
}

export async function fetchPromoted(category: string, limit = FEATURE_PROMOTED_LIMIT) {
  const res = await api.get('/auctions/promoted', { params: { category, limit } });
  return parseCardList(res.data);
}
