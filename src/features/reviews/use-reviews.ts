'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nextPagedParam } from '@/lib/paged';
import { useAdminList } from '@/features/admin/use-admin';
import * as api from './reviews.api';
import type { AdminReviewFilters } from './reviews.types';

/** A seller's public reviews, newest first (infinite scroll, docs/PAGINATION.md). */
export function useSellerReviews(sellerId: string) {
  return useInfiniteQuery({
    queryKey: ['reviews', 'seller', sellerId],
    queryFn: ({ pageParam }) => api.fetchSellerReviews(sellerId, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
  });
}

/** Rate the seller of a won auction. Refreshes the detail (`review`/`canReview`), My bids and seller pages. */
export function useCreateReview(auctionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { rating: number; comment?: string }) => api.createReview(auctionId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auction', auctionId] });
      void qc.invalidateQueries({ queryKey: ['my-bids'] });
      void qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useReplyToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => api.replyToReview(id, reply),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews'] });
      void qc.invalidateQueries({ queryKey: ['auction'] });
    },
  });
}

export const useAdminReviews = (f: AdminReviewFilters, page: number, size: number) =>
  useAdminList('reviews', f, page, size, api.fetchAdminReviews);

export function useSetReviewHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => api.setReviewHidden(id, hidden),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['reviews'] });
      void qc.invalidateQueries({ queryKey: ['auction'] });
      void qc.invalidateQueries({ queryKey: ['auctions'] });
    },
  });
}
