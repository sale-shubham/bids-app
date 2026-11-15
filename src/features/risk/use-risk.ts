'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminList } from '@/features/admin/use-admin';
import * as api from './risk.api';

export const useAdminRisk = (f: { tab: 'open' | 'reviewed' }, page: number, size: number) => useAdminList('risk', f, page, size, api.fetchRisk);

export function useReviewRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.reviewRisk,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'risk'] }),
  });
}
