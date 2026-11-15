'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextPagedParam, type Paged } from '@/lib/paged';
import { useAuthStore } from '@/store/auth-store';
import * as api from './follows.api';
import type { FollowedSeller, FollowState } from './follows.api';

export const followStateKey = (sellerId: string) => ['follow', sellerId] as const;
export const followingKey = ['following'] as const;

/** Follow state of one seller for the signed-in viewer (off for guests, who are never "following"). */
export function useFollowState(sellerId: string, initialCount?: number) {
  const isMember = useAuthStore((s) => !!s.member);
  return useQuery({
    queryKey: followStateKey(sellerId),
    queryFn: () => api.fetchFollowState(sellerId),
    enabled: isMember,
    staleTime: 60_000,
    placeholderData: initialCount === undefined ? undefined : { following: false, followerCount: initialCount },
  });
}

/** Optimistic follow / unfollow: the state flips at once and rolls back if the call fails. */
export function useToggleFollow(sellerId: string) {
  const qc = useQueryClient();
  const key = followStateKey(sellerId);
  return useMutation({
    mutationFn: ({ follow }: { follow: boolean }) => (follow ? api.followSeller(sellerId) : api.unfollowSeller(sellerId)),
    onMutate: async ({ follow }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<FollowState>(key);
      const count = prev?.followerCount ?? 0;
      qc.setQueryData<FollowState>(key, { following: follow, followerCount: Math.max(0, count + (follow ? 1 : -1)) });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      else qc.removeQueries({ queryKey: key });
    },
    onSuccess: (state) => qc.setQueryData(key, state),
    onSettled: () => void qc.invalidateQueries({ queryKey: followingKey }),
  });
}

export function useFollowing(enabled = true) {
  return useInfiniteQuery({
    queryKey: followingKey,
    queryFn: ({ pageParam }) => api.fetchFollowing(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam<FollowedSeller>,
    enabled,
  });
}

/** Unfollow from the Following list: the row leaves the list at once, restored if the call fails. */
export function useUnfollowFromList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sellerId: string) => api.unfollowSeller(sellerId),
    onMutate: async (sellerId) => {
      await qc.cancelQueries({ queryKey: followingKey });
      const prev = qc.getQueryData(followingKey);
      qc.setQueryData<{ pages: Paged<FollowedSeller>[]; pageParams: unknown[] }>(followingKey, (d) =>
        d && { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.filter((s) => s.id !== sellerId) })) },
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(followingKey, ctx.prev);
    },
    onSettled: (_d, _e, sellerId) => {
      void qc.invalidateQueries({ queryKey: followStateKey(sellerId) });
      void qc.invalidateQueries({ queryKey: followingKey });
    },
  });
}
