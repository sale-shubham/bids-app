'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ME_KEY } from '@/features/members/use-members';
import { useRazorpayPayment } from '@/features/payments/use-razorpay-payment';
import { CREDITS_KEY, REFERRAL_KEY } from '@/features/referrals/use-referrals';
import * as api from './featured.api';
import { featuredErrorMessage } from './featured.errors';
import type { FeatureDays } from './featured.types';

export const featureKey = (auctionId: string) => ['auction-feature', auctionId] as const;

export function useAuctionFeature(auctionId: string, enabled = true) {
  return useQuery({ queryKey: featureKey(auctionId), queryFn: () => api.fetchAuctionFeature(auctionId), enabled });
}

/** Up to 2 promoted auctions for a category browse (`slug` empty = off). */
export function usePromoted(category: string) {
  return useQuery({
    queryKey: ['auctions', 'promoted', category],
    queryFn: () => api.fetchPromoted(category),
    enabled: !!category,
    staleTime: 60_000,
  });
}

/** Pay for a promotion: with credits (one call) or through Razorpay via `useRazorpayPayment`. */
export function usePromoteAuction(auctionId: string, confirmStub: () => Promise<boolean>) {
  const qc = useQueryClient();
  const invalidate = [featureKey(auctionId), ['auction', auctionId], ['auctions'], REFERRAL_KEY, CREDITS_KEY, ME_KEY] as const;

  const card = useRazorpayPayment({
    // `pay(id)` carries the number of days.
    createCheckout: async (days) => {
      const r = await api.createFeatureCheckout(auctionId, { days: Number(days) as FeatureDays });
      if ('paidWithCredits' in r) throw new Error('Unexpected credits payment');
      return r;
    },
    invalidateKeys: invalidate,
    confirmStub,
    successMessage: 'Payment successful. Your auction is now promoted.',
    errorMessage: featuredErrorMessage,
  });

  const credits = useMutation({
    mutationFn: (days: FeatureDays) => api.createFeatureCheckout(auctionId, { days, useCredits: true }),
    onSuccess: () => {
      for (const queryKey of invalidate) void qc.invalidateQueries({ queryKey });
    },
  });

  return { payWithCard: (days: FeatureDays) => card.pay(String(days)), payWithCredits: credits, cardPaying: card.payingId !== null };
}
