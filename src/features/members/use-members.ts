'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as membersApi from './members.api';

export const ME_KEY = ['me'] as const;

// The signed-in member. AuthBootstrap runs the same query and mirrors it into
// the zustand store; read the store for cheap access, use this for refetch.
export function useMe(enabled = true) {
  return useQuery({ queryKey: ME_KEY, queryFn: membersApi.fetchMe, enabled });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  const setMember = useAuthStore((s) => s.setMember);
  return useMutation({
    mutationFn: membersApi.updateMe,
    onSuccess: (updated) => {
      const current = useAuthStore.getState().member;
      if (current) setMember({ ...current, ...updated });
      void qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}

export function useSendPhoneOtp() {
  return useMutation({ mutationFn: membersApi.sendPhoneOtp });
}

export function useVerifyPhone() {
  const qc = useQueryClient();
  const setMember = useAuthStore((s) => s.setMember);
  return useMutation({
    mutationFn: membersApi.verifyPhone,
    onSuccess: (updated) => {
      const current = useAuthStore.getState().member;
      if (current) setMember({ ...current, ...updated });
      void qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
