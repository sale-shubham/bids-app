'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/api-client';
import { recordEngagement } from '@/lib/engagement';
import { nextPagedParam } from '@/lib/paged';
import { useAuthStore } from '@/store/auth-store';
import * as api from './watchlist.api';
import type { WatchlistIds } from './watchlist.api';

export const watchlistIdsKey = ['watchlist-ids'] as const;
export const watchlistKey = ['watchlist'] as const;

/** Ids of every watched auction: loaded once for signed-in members and shared by all hearts. */
export function useWatchlistIds() {
  const isMember = useAuthStore((s) => !!s.member);
  return useQuery({
    queryKey: watchlistIdsKey,
    queryFn: api.fetchWatchlistIds,
    enabled: isMember,
    staleTime: 5 * 60_000,
  });
}

/** Count of watched auctions that are still live/upcoming (nav badge). */
export function useWatchlistActiveCount(): number {
  return useWatchlistIds().data?.activeCount ?? 0;
}

export function useIsWatching(auctionId: string): boolean {
  const { data } = useWatchlistIds();
  return !!data?.ids.includes(auctionId);
}

export function useWatchlist() {
  return useInfiniteQuery({
    queryKey: watchlistKey,
    queryFn: ({ pageParam }) => api.fetchWatchlist(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
  });
}

/** Optimistic add/remove with rollback; ids, list and the auction detail are refetched afterwards. */
export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ auctionId, watching }: { auctionId: string; watching: boolean }) => {
      if (watching) await api.addToWatchlist(auctionId);
      else await api.removeFromWatchlist(auctionId);
    },
    onMutate: async ({ auctionId, watching }) => {
      await qc.cancelQueries({ queryKey: watchlistIdsKey });
      const prev = qc.getQueryData<WatchlistIds>(watchlistIdsKey);
      qc.setQueryData<WatchlistIds>(watchlistIdsKey, (old) => {
        const ids = old?.ids ?? [];
        const has = ids.includes(auctionId);
        return {
          ids: watching ? (has ? ids : [...ids, auctionId]) : ids.filter((i) => i !== auctionId),
          activeCount: old?.activeCount ?? 0,
        };
      });
      return { prev };
    },
    onSuccess: (_d, { watching }) => {
      if (watching) recordEngagement('watch'); // unlocks the push soft prompt
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(watchlistIdsKey, ctx.prev);
      toast.error(apiErrorMessage(e, 'Could not update your watchlist'));
    },
    onSettled: (_d, _e, { auctionId }) => {
      void qc.invalidateQueries({ queryKey: watchlistIdsKey });
      void qc.invalidateQueries({ queryKey: watchlistKey });
      void qc.invalidateQueries({ queryKey: ['auction', auctionId] });
    },
  });
}
