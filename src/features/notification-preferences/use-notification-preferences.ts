'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { ME_KEY } from '@/features/members/use-members';
import * as api from './notification-preferences.api';
import type { NotificationPreferences, PreferenceInput } from './notification-preferences.api';

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

/** Turns WhatsApp alerts on/off; mirrors the flag into the auth store and the preferences cache. */
export function useWhatsappOptIn() {
  const qc = useQueryClient();
  const setMember = useAuthStore((s) => s.setMember);
  return useMutation({
    mutationFn: (optIn: boolean) => api.setWhatsappOptIn(optIn),
    onSuccess: (whatsappOptIn) => {
      const current = useAuthStore.getState().member;
      if (current) setMember({ ...current, whatsappOptIn });
      qc.setQueryData<NotificationPreferences>(preferencesKey, (d) => d && { ...d, whatsappOptIn });
      void qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
