'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useAuction(id: string, initial?: AuctionDetail) {
  return useQuery({
    queryKey: ['auction', id],
    queryFn: async () => (await api.fetchAuction(id)).auction,
    ...(initial ? { initialData: initial } : {}),
  });
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
