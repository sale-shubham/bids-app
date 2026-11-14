'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { nextPagedParam } from '@/lib/paged';
import * as api from './commissions.api';
import type { CommissionTab } from './commissions.types';

export const COMMISSION_SUMMARY_KEY = ['commissions', 'summary'] as const;

export function useCommissions(status: CommissionTab) {
  return useInfiniteQuery({
    queryKey: ['commissions', status],
    queryFn: ({ pageParam }) => api.fetchCommissions(status, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
  });
}

export function useCommissionSummary(enabled = true) {
  return useQuery({ queryKey: COMMISSION_SUMMARY_KEY, queryFn: api.fetchCommissionSummary, enabled });
}
