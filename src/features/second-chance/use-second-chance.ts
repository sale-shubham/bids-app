'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { saleKeys } from '@/features/sales/use-sales';
import * as api from './second-chance.api';

export const offerKeys = {
  all: ['second-chance'] as const,
  mine: ['second-chance', 'mine'] as const,
  one: (id: string) => ['second-chance', 'one', id] as const,
};

export function useMyOffers() {
  return useQuery({ queryKey: offerKeys.mine, queryFn: api.fetchMyOffers });
}

export function useOffer(id: string) {
  return useQuery({ queryKey: offerKeys.one(id), queryFn: () => api.fetchOffer(id), enabled: !!id });
}

/** Everything an offer change can affect: offers, sales (incl. the new one), auction detail, my-bids, notifications. */
export function useInvalidateOffers() {
  const qc = useQueryClient();
  return () => {
    for (const queryKey of [offerKeys.all, saleKeys.all, ['auction'], ['my-bids'], ['notifications']]) {
      void qc.invalidateQueries({ queryKey });
    }
  };
}

export function useAcceptOffer(id: string) {
  const done = useInvalidateOffers();
  return useMutation({ mutationFn: () => api.acceptOffer(id), onSuccess: done });
}

export function useDeclineOffer(id: string) {
  const done = useInvalidateOffers();
  return useMutation({ mutationFn: () => api.declineOffer(id), onSuccess: done });
}

/** Seller: offer to the runner-up. Refreshes the sale (`secondChanceOffer`, `canOfferSecondChance`). */
export function useOfferSecondChance(saleId: string) {
  const done = useInvalidateOffers();
  return useMutation({ mutationFn: () => api.createSecondChance(saleId), onSuccess: done });
}
