'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nextPagedParam } from '@/lib/paged';
import { recordEngagement } from '@/lib/engagement';
import * as api from './bids.api';
import type { MyBidsTab } from './bids.types';

export function usePlaceBid(auctionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amountPaise: number) => api.placeBid(auctionId, amountPaise),
    onSuccess: (data) => {
      recordEngagement('bid'); // unlocks the push soft prompt + install banner
      // The response carries the fresh auction (server offset already synced in bids.api).
      if (data.auction) qc.setQueryData(['auction', auctionId], data.auction);
      void qc.invalidateQueries({ queryKey: ['auction-bids', auctionId] });
      void qc.invalidateQueries({ queryKey: ['my-bids'] });
      void qc.invalidateQueries({ queryKey: ['auctions'] });
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

export function useMyBids(tab: MyBidsTab) {
  return useInfiniteQuery({
    queryKey: ['my-bids', tab],
    queryFn: ({ pageParam }) => api.fetchMyBids(tab, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
  });
}
