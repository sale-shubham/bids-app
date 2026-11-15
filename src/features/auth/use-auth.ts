'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { resetAuthFlags } from '@/lib/api-client';
import { useAuthStore, type AuthMember, type Role } from '@/store/auth-store';
import { destinationFor } from '@/constants/routes';
import * as authApi from './auth.api';
import { syncAppBadge } from '@/lib/push';

// Post-login target. `?next=` is set by the edge gate / client guards when they
// bounce someone off a page they asked for; only member roles follow it
// (destinationFor, shared with the edge gate). SUPER_ADMIN always lands on /admin.
function landingFor(role: Role) {
  const next = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('next');
  return destinationFor(role, next);
}

// Shared by login and signup-verify: both end with the auth cookies set.
function useSignedIn() {
  const setMember = useAuthStore((s) => s.setMember);
  const qc = useQueryClient();
  const router = useRouter();
  return (member: AuthMember) => {
    resetAuthFlags();
    setMember(member);
    // The login body may be a subset of /members/me; refetch fills the rest.
    void qc.invalidateQueries({ queryKey: ['me'] });
    router.replace(landingFor(member.role));
  };
}

export function useLogin() {
  const signedIn = useSignedIn();
  return useMutation({ mutationFn: authApi.login, onSuccess: signedIn });
}

export function useSignup() {
  return useMutation({ mutationFn: authApi.signup });
}

export function useSignupVerify() {
  const signedIn = useSignedIn();
  return useMutation({ mutationFn: authApi.signupVerify, onSuccess: signedIn });
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

export function useChangePassword() {
  return useMutation({ mutationFn: authApi.changePassword });
}

// Wipes every client-side trace of the session, then goes to /login.
function useSessionEnded() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  const router = useRouter();
  return () => {
    clear();
    qc.clear();
    // The server deleted this session's push subscription with it; the icon badge goes too.
    void syncAppBadge(0);
    router.push('/login');
  };
}

export function useLogout() {
  const ended = useSessionEnded();
  return useMutation({ mutationFn: authApi.logout, onSuccess: ended });
}

export function useLogoutAll() {
  const ended = useSessionEnded();
  return useMutation({ mutationFn: authApi.logoutAll, onSuccess: ended });
}

// This account's own logged-in devices.
export function useSessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: authApi.fetchSessions });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.revokeSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
