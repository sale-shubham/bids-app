'use client';
import { useInfiniteQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatINR } from '@/lib/utils';
import { nextPagedParam } from '@/lib/paged';
import { usePagedList } from '@/hooks/use-paged-list';
import { recordEngagement } from '@/lib/engagement';
import * as api from './bids.api';
import type { MyBidsTab } from './bids.types';

/** Keys refreshed after any bid or buy-now. */
function invalidateBidKeys(qc: QueryClient, auctionId: string) {
  void qc.invalidateQueries({ queryKey: ['auction-bids', auctionId] });
  void qc.invalidateQueries({ queryKey: ['my-bids'] });
  void qc.invalidateQueries({ queryKey: ['auctions'] });
}

/** Every bid is a MAX bid (`maxAmountPaise`): the system bids only as much as needed. */
export function usePlaceBid(auctionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (maxAmountPaise: number) => api.placeBid(auctionId, maxAmountPaise),
    onSuccess: (data, maxAmountPaise) => {
      // Toast here, not in the component's mutate() callback: the cache update below can swap the bid
      // controls out (you are now the highest bidder), unmounting them before that callback would run.
      if (data.outbidByProxy) toast.warning("Another bidder's maximum is higher. Try a higher maximum.");
      else toast.success(`Maximum bid of ${formatINR(maxAmountPaise)} placed`);
      recordEngagement('bid'); // unlocks the push soft prompt + install banner
      // The response carries the fresh auction (server offset already synced in bids.api).
      if (data.auction) qc.setQueryData(['auction', auctionId], data.auction);
      invalidateBidKeys(qc, auctionId);
    },
  });
}

/** Buy It Now: ends the auction immediately with the caller as the winner. */
export function useBuyNow(auctionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.buyNow(auctionId),
    onSuccess: (data) => {
      toast.success('You bought this item');
      recordEngagement('bid');
      if (data.auction) qc.setQueryData(['auction', auctionId], data.auction);
      invalidateBidKeys(qc, auctionId);
    },
  });
}

/** Full paginated bid history, newest first. Enable it only when the list is opened. */
export function useAuctionBids(auctionId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['auction-bids', auctionId],
    queryFn: ({ pageParam }) => api.fetchAuctionBids(auctionId, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
    enabled,
  });
}

/** The member's bids for one tab, paged (table on wide, infinite cards on narrow). Key prefix `['my-bids']` is invalidated after every bid. */
export function useMyBids(tab: MyBidsTab, page: number, pageSize: number) {
  return usePagedList(['my-bids'], { tab }, page, pageSize, (f, p, size) => api.fetchMyBids(f.tab, p, size));
}
