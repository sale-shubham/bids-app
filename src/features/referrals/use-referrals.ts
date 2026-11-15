'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { nextPagedParam } from '@/lib/paged';
import { useAuthStore } from '@/store/auth-store';
import * as api from './referrals.api';

export const REFERRAL_KEY = ['referral'] as const;
export const CREDITS_KEY = ['credits'] as const;

export function useReferral(enabled = true) {
  return useQuery({ queryKey: REFERRAL_KEY, queryFn: api.fetchReferral, enabled });
}

/** Signed-in member's credit balance in paise (0 while loading or when signed out). */
export function useCreditBalance(): number {
  const signedIn = useAuthStore((s) => !!s.member && s.member.role !== 'SUPER_ADMIN');
  const { data } = useReferral(signedIn);
  return data?.creditBalancePaise ?? 0;
}

export function useCredits() {
  return useInfiniteQuery({
    queryKey: CREDITS_KEY,
    queryFn: ({ pageParam }) => api.fetchCredits(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
  });
}
