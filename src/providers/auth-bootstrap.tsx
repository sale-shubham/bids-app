'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { fetchMe } from '@/features/auth/auth.api';
import { api, isUnreachableError } from '@/lib/api-client';
import { isAuthRoute, isPublicRoute } from '@/constants/routes';

// On mount, try to silently restore the session: refresh access token, then load /me.
// A real react-query cache (not a one-off effect) so `invalidateQueries(['member-me'])`
// — already called by mutations — actually refetches and
// syncs the zustand store, instead of being a no-op until the next full page load.
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Guest-only routes (AUTH_ROUTES) *and* public routes (PUBLIC_PREFIXES, e.g.
  // /pages/*) both skip fetchMe(): a visitor there may legitimately have no
  // cookie at all, and calling an authenticated endpoint only produced a
  // pointless 401 -> silent-refresh-401 -> forceLogout() -> redirect-to-/login
  // chain (see readme/methods/api-client.md's forceLogout() notes). Tables are
  // shared with src/proxy.ts via src/constants/routes.ts so the edge gate
  // and this gate can't drift.
  const isGuestRoute = isAuthRoute(pathname) || isPublicRoute(pathname);
  const { setMember, setInitialized } = useAuthStore();
  const { data, error, isError, isFetched } = useQuery({
    queryKey: ['member-me'],
    queryFn: fetchMe,
    // A 401 is a final answer and must not be retried — the interceptor has
    // already tried to refresh by the time it reaches here. An unreachable API
    // is not an answer at all: retry it. This is the cold-start case for an
    // installed PWA, where the very first request often goes out before the
    // phone's connection is actually up.
    retry: (count, err) => count < 3 && isUnreachableError(err),
    retryDelay: (count) => Math.min(1000 * 2 ** count, 8000),
    // Overrides the app-wide `refetchOnWindowFocus: false`
    // (src/lib/query-client.ts) for this one query. Bringing an installed PWA
    // back to the foreground fires focus, and regaining signal fires
    // reconnect: both are exactly when a session that could not be confirmed
    // at launch should be retried, and neither costs anything while it can be.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !isGuestRoute,
  });

  React.useEffect(() => {
    if (isGuestRoute) {
      setInitialized(true);
      return;
    }
    if (!isFetched) return;
    // Never sign the user out over a connection failure. Staying
    // uninitialized keeps <AuthGuard> on its loader (with <OfflineBanner>
    // above it) instead of redirecting to /login; react-query's refetch on
    // reconnect and on window focus — which is what a PWA being brought back
    // to the foreground fires — picks the session back up.
    if (isError && isUnreachableError(error)) return;
    setMember(isError ? null : (data ?? null));
    setInitialized(true);
  }, [data, error, isError, isFetched, isGuestRoute, setMember, setInitialized]);

  // Keep api import referenced (interceptors are registered on import).
  void api;
  return <>{children}</>;
}
