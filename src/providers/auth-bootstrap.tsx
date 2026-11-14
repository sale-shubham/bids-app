'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { fetchMe } from '@/features/members/members.api';
import { ME_KEY } from '@/features/members/use-members';
import { isUnreachableError } from '@/lib/api-client';
import { isAuthRoute } from '@/constants/routes';

// Restores the session on load: GET /members/me (the api-client interceptor
// silently refreshes an expired access cookie first) and mirrors the result
// into the zustand auth store. A real react-query cache (not a one-off effect)
// so `invalidateQueries(['me'])` — called by mutations — refetches and
// re-syncs the store.
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Guest-only pages (login, signup, …) skip the call: the visitor there has no
  // session by definition, so it would only produce a pointless 401. Public
  // pages (auctions, legal) DO fetch — the header shows the user menu for a
  // logged-in visitor — and a 401 there just means "logged out".
  const skip = isAuthRoute(pathname);
  const { setMember, setInitialized } = useAuthStore();
  const { data, error, isError, isFetched } = useQuery({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    // A 401 is a final answer and must not be retried — the interceptor has
    // already tried to refresh by the time it reaches here. An unreachable API
    // is not an answer at all: retry it (cold-start of an installed PWA).
    retry: (count, err) => count < 3 && isUnreachableError(err),
    retryDelay: (count) => Math.min(1000 * 2 ** count, 8000),
    // Overrides the app-wide `refetchOnWindowFocus: false` for this one query:
    // bringing a PWA to the foreground / regaining signal is exactly when a
    // session that could not be confirmed at launch should be retried.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !skip,
  });

  React.useEffect(() => {
    if (skip) {
      setInitialized(true);
      return;
    }
    if (!isFetched) return;
    // Never sign the user out over a connection failure: staying uninitialized
    // keeps <AuthGuard> on its loader instead of redirecting to /login.
    if (isError && isUnreachableError(error)) return;
    setMember(isError ? null : (data ?? null));
    setInitialized(true);
  }, [data, error, isError, isFetched, skip, setMember, setInitialized]);

  return <>{children}</>;
}
