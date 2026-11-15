'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as api from './notification-preferences.api';
import type { PreferenceInput } from './notification-preferences.api';

export const preferencesKey = ['notification-preferences'] as const;

export function useNotificationPreferences() {
  const isMember = useAuthStore((s) => !!s.member);
  return useQuery({ queryKey: preferencesKey, queryFn: api.fetchPreferences, enabled: isMember });
}

export function useSavePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: PreferenceInput[]) => api.savePreferences(items),
    onSuccess: (data) => qc.setQueryData(preferencesKey, data),
  });
}
