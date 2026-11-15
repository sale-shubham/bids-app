'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as api from './saved-searches.api';
import type { SavedSearchPayload } from './saved-searches.types';

export const savedSearchesKey = ['saved-searches'] as const;

export function useSavedSearches() {
  const isBidder = useAuthStore((s) => s.member?.role === 'BIDDER');
  return useQuery({ queryKey: savedSearchesKey, queryFn: api.fetchSavedSearches, enabled: isBidder });
}

export function useCreateSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SavedSearchPayload) => api.createSavedSearch(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: savedSearchesKey }),
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSavedSearch(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: savedSearchesKey }),
  });
}
