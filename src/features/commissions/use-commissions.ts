'use client';
import { useQuery } from '@tanstack/react-query';
import { usePagedList } from '@/hooks/use-paged-list';
import * as api from './commissions.api';
import type { CommissionTab } from './commissions.types';

export const COMMISSION_SUMMARY_KEY = ['commissions', 'summary'] as const;

/** Key prefix `['commissions','mine']` stays under `['commissions']`, which the pay hooks and admin invalidate. */
export function useCommissions(status: CommissionTab, page: number, pageSize: number) {
  return usePagedList(['commissions', 'mine'], { status }, page, pageSize, (f, p, size) => api.fetchCommissions(f.status, p, size));
}

export function useCommissionSummary(enabled = true) {
  return useQuery({ queryKey: COMMISSION_SUMMARY_KEY, queryFn: api.fetchCommissionSummary, enabled });
}
