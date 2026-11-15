'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './strikes.api';

export const strikeKeys = { member: (id: string) => ['admin', 'strikes', id] as const };

export function useMemberStrikes(memberId: string, enabled = true) {
  return useQuery({ queryKey: strikeKeys.member(memberId), queryFn: () => api.fetchMemberStrikes(memberId), enabled: enabled && !!memberId });
}

export function useRemoveStrike(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => api.removeStrike(id, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: strikeKeys.member(memberId) });
      void qc.invalidateQueries({ queryKey: ['admin'] }); // member list carries `activeStrikes`
    },
  });
}
