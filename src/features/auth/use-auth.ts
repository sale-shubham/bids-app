'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/api-client';
import { useAuthStore, type Role } from '@/store/auth-store';
import { homeFor, safeNextPath } from '@/constants/routes';
import * as authApi from './auth.api';
import { syncAppBadge } from '@/lib/push';

// Post-login target. `?next=` is set by the edge gate when it bounces someone
// off a page they asked for (see proxy.ts). SUPER_ADMIN never follows it.
function landingFor(role: Role) {
  if (role === 'SUPER_ADMIN') return homeFor(role);
  const next = typeof window === 'undefined'
    ? null
    : safeNextPath(new URLSearchParams(window.location.search).get('next'));
  return next ?? homeFor(role);
}

export function useLogin() {
  const setMember = useAuthStore((s) => s.setMember);
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (member) => {
      setMember(member);
      router.push(landingFor(member.role));
    },
  });
}

export function useSignupStart() {
  return useMutation({ mutationFn: authApi.signupStart });
}

export function useSignupVerify() {
  const setMember = useAuthStore((s) => s.setMember);
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.signupVerify,
    onSuccess: (member) => {
      setMember(member);
      router.push(landingFor(member.role));
    },
  });
}

export function useSignupResend() {
  return useMutation({ mutationFn: authApi.signupResend });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clear();
      qc.clear();
      // The server deleted this session's push subscription with it
      // (readme/flows/push-notifications.md); the icon badge goes too.
      void syncAppBadge(0);
      router.push('/login');
    },
  });
}

// This account's own logged-in devices (self-service — see auth.api.ts's
// DeviceSession). Not gated by role: a SUPER_ADMIN calling it removes a
// device from their own SUPER_ADMIN account, same as any Member would.
export function useMySessions() {
  return useQuery({ queryKey: ['my-sessions'], queryFn: authApi.fetchMySessions });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.revokeMySession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-sessions'] }),
  });
}

// Profile page's Edit name. Patches the auth store in place (the header
// label reads it) and refetches /members/me for everything else.
export function useUpdateMyName() {
  const qc = useQueryClient();
  const setMember = useAuthStore((s) => s.setMember);
  return useMutation({
    mutationFn: authApi.updateMyName,
    onSuccess: ({ member }) => {
      const current = useAuthStore.getState().member;
      if (current) setMember({ ...current, name: member.name });
      qc.invalidateQueries({ queryKey: ['member-me'] });
      toast.success('Name updated');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
}
