'use client';
import * as React from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerNow } from '@/components/common/countdown';
import * as api from './auctions.api';
import { nextAuctionPage } from './auctions.filters';
import type {
  AuctionDetail,
  AuctionFilters,
  AuctionPage,
  AuctionPageParam,
  AuctionWritePayload,
  MineStatus,
} from './auctions.types';

const FIRST: AuctionPageParam = { page: 1 };

// Public browse list. `initialPage` is the server-fetched first page for exactly
// these filters (the page component passes both from the same searchParams).
export function useAuctionsList(filters: AuctionFilters, initialPage?: AuctionPage | null) {
  return useInfiniteQuery({
    queryKey: ['auctions', filters],
    queryFn: ({ pageParam }) => api.fetchAuctions(filters, pageParam),
    initialPageParam: FIRST,
    getNextPageParam: nextAuctionPage,
    ...(initialPage ? { initialData: { pages: [initialPage], pageParams: [FIRST] } } : {}),
  });
}

export function useMyAuctions(status: MineStatus) {
  return useInfiniteQuery({
    queryKey: ['auctions', 'mine', status],
    queryFn: ({ pageParam }) => api.fetchMyAuctions(status, pageParam),
    initialPageParam: FIRST,
    getNextPageParam: nextAuctionPage,
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['auctions', 'categories'], queryFn: api.fetchCategories, staleTime: 5 * 60_000 });
}

const POLL_MS = 10_000;
const CLOSE_JOB_LAG_MS = 70_000;

// Until the WebSocket lands (Phase 4) the page polls while the tab is visible and the
// auction can still change. `initialDataUpdatedAt: 0` makes the server-rendered
// (anonymous) detail refetch on mount so isMe / myHighestBidPaise / contact arrive.
export function useAuction(id: string, initial?: AuctionDetail) {
  return useQuery({
    queryKey: ['auction', id],
    queryFn: async () => (await api.fetchAuction(id)).auction,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'LIVE' || s === 'SCHEDULED' ? POLL_MS : false;
    },
    refetchIntervalInBackground: false,
    ...(initial ? { initialData: initial, initialDataUpdatedAt: 0 } : {}),
  });
}

/**
 * Refetch once when the start time passes, once when the end time passes, and once more
 * 70 s after the end (the server's close job runs about a minute late).
 */
export function useAuctionBoundaryRefetch(
  auction: Pick<AuctionDetail, 'status' | 'startTime' | 'endTime'> | undefined,
  refetch: () => unknown,
) {
  const now = useServerNow();
  const fired = React.useRef<Record<string, boolean>>({});
  const open = auction?.status === 'LIVE' || auction?.status === 'SCHEDULED';
  const scheduled = auction?.status === 'SCHEDULED';
  const start = auction ? Date.parse(auction.startTime) : 0;
  const end = auction ? Date.parse(auction.endTime) : 0;
  const run = React.useEffectEvent((key: string) => {
    if (fired.current[key]) return;
    fired.current[key] = true;
    void refetch();
  });
  React.useEffect(() => {
    if (!open || now === 0) return;
    if (scheduled && now >= start) run(`start:${start}`);
    if (now >= end) run(`end:${end}`);
    if (now >= end + CLOSE_JOB_LAG_MS) run(`close:${end}`);
  }, [now, open, scheduled, start, end]);
}

function useInvalidateAuctions() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: ['auctions'] });
    if (id) void qc.invalidateQueries({ queryKey: ['auction', id] });
  };
}

export function useCreateAuction() {
  const invalidate = useInvalidateAuctions();
  return useMutation({ mutationFn: (input: AuctionWritePayload) => api.createAuction(input), onSuccess: () => invalidate() });
}

export function useUpdateAuction(id: string) {
  const invalidate = useInvalidateAuctions();
  return useMutation({
    mutationFn: (input: Partial<AuctionWritePayload>) => api.updateAuction(id, input),
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteAuction() {
  const invalidate = useInvalidateAuctions();
  return useMutation({ mutationFn: (id: string) => api.deleteAuction(id), onSuccess: (_d, id) => invalidate(id) });
}

export function useRepublishAuction() {
  const invalidate = useInvalidateAuctions();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; startTime: string; endTime: string }) => api.republishAuction(id, body),
    onSuccess: (_d, v) => invalidate(v.id),
  });
}

export type { MineStatus };
