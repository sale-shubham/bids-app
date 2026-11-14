'use client';
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/api-client';
import {
  currentSubscription,
  onPermissionChange,
  pushBlockedReason,
  pushPermission,
  pushSupported,
  subscribeToPush,
  syncAppBadge,
  unsubscribeFromPush,
} from '@/lib/push';
import { isStandalone } from '@/lib/pwa';
import { useAuthStore } from '@/store/auth-store';
import { useHydrated } from '@/hooks/use-client-state';
import * as api from './push.api';
const { fetchUnreadCount } = api;

// App-icon badge + Web Push for notifications — readme/flows/push-notifications.md.

/** The member's unread notification total. the auction socket invalidates it on every `dm:*` frame. */
export const unreadCountKey = ['unread-count'] as const;

export const pushKeys = {
  // Whether THIS browser holds a push subscription. In the query cache, not
  // component state: the permission prompt and the Profile switch both ask,
  // and two useState copies drift the moment one of them turns push on.
  subscription: () => ['push', 'subscription'] as const,
  vapid: () => ['push', 'vapid'] as const,
};

const useIsMember = () => useAuthStore((s) => !!s.member);

/**
 * The member's unread notification total — one cache entry (`unreadCountKey`) read by the
 * app-icon badge (useAppBadge) and the Chat nav item's count (useMemberNav),
 * so both always show the same number from one request.
 *
 * **No interval.** The WebSocket invalidates it the instant a message arrives
 * or a thread is read on any device. Focus/reconnect refetching (overriding the
 * app-wide `refetchOnWindowFocus: false`) is the safety net under the socket —
 * a connection mid-reconnect, or local dev with no WebSocket API — not polling.
 */
export function useUnreadMessageCount() {
  const isMember = useIsMember();
  return useQuery({
    queryKey: unreadCountKey,
    queryFn: fetchUnreadCount,
    enabled: isMember,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 15_000,
  });
}

/**
 * The number on the installed app's icon while the app is open, kept in step
 * with the server. Mounted once for the whole member area (MessagingLive), so
 * it stays right on pages that have nothing to do with chat.
 */
export function useAppBadge() {
  const qc = useQueryClient();
  const query = useUnreadMessageCount();

  // The service worker reports the count on every push it handles
  // (`NOTIFICATION_COUNT`, public/sw.js). Mostly redundant with the socket —
  // but the worker skips the banner when this thread is already on screen, and
  // if the socket were mid-reconnect at that moment this is the only signal.
  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; unread?: number } | undefined;
      if (data?.type !== 'NOTIFICATION_COUNT' || typeof data.unread !== 'number') return;
      qc.setQueryData(unreadCountKey, data.unread);
      void qc.invalidateQueries({ queryKey: ['my-conversations'] });
      void qc.invalidateQueries({ queryKey: ['messages'] });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [qc]);

  // The server's count is the badge — painted whatever wrote it (socket
  // invalidation, the worker's message, a mark-read).
  React.useEffect(() => {
    if (query.data === undefined) return;
    void syncAppBadge(query.data);
  }, [query.data]);

  return query;
}

export type PushState = 'unsupported' | 'blocked' | 'off' | 'on';

/**
 * Turning this device's DM notifications on and off.
 *
 * Three things have to line up and none implies the others: the browser
 * permission, a live `PushSubscription` in this browser, and a row for it on
 * the server. `state` reports the combination so the switch can say what to do.
 */
export function usePushSubscription() {
  const qc = useQueryClient();
  const isMember = useIsMember();
  const [busy, setBusy] = React.useState(false);
  // Browser APIs don't exist during SSR; deciding before mount would render
  // one state on the server and another on the client (hydration mismatch).
  const mounted = useHydrated();
  const supported = mounted && pushSupported();

  const { data: vapidKey } = useQuery({
    queryKey: pushKeys.vapid(),
    queryFn: api.fetchVapidPublicKey,
    enabled: isMember && supported,
    staleTime: Infinity,
  });

  /**
   * Does this browser hold a subscription — and re-register it with the API.
   *
   * The re-post lives in the queryFn so it runs once however many components
   * ask. It matters more here than in Unikorn: a subscription row is bound to
   * the login session (cascade-deleted on logout, eviction, revoke), so this is
   * what re-attaches the browser's subscription after every sign-in. The POST
   * is an idempotent upsert on the endpoint.
   */
  const { data: subscribed } = useQuery({
    queryKey: pushKeys.subscription(),
    queryFn: async () => {
      const sub = await currentSubscription();
      if (!sub) return false;
      try {
        await api.savePushSubscription(sub.toJSON());
      } catch {
        /* best effort — the in-app socket still works without push */
      }
      return true;
    },
    enabled: isMember && supported,
    staleTime: Infinity,
  });

  // The permission can change outside the app (site settings, iOS Settings)
  // with no event of its own. Re-render on a real change, and invalidate the
  // subscription query: revoking the permission drops the browser's
  // subscription, and `staleTime: Infinity` would keep answering `true`.
  const [, permissionChanged] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    if (!mounted) return;
    return onPermissionChange(() => {
      permissionChanged();
      void qc.invalidateQueries({ queryKey: pushKeys.subscription() });
    });
  }, [mounted, qc]);

  const blockedReason = mounted ? pushBlockedReason() : null;
  const state: PushState = !supported ? 'unsupported' : pushPermission() === 'denied' ? 'blocked' : subscribed ? 'on' : 'off';

  const enable = React.useCallback(async () => {
    const reason = pushBlockedReason();
    if (reason) {
      toast.error(reason);
      return;
    }
    if (!vapidKey) {
      toast.error('Notifications are not set up on the server yet.');
      return;
    }
    setBusy(true);
    try {
      const result = await subscribeToPush(vapidKey);
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      await api.savePushSubscription(result.subscription.toJSON());
      qc.setQueryData(pushKeys.subscription(), true);
      void qc.invalidateQueries({ queryKey: unreadCountKey });
      toast.success('Message notifications are on for this device');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [qc, vapidKey]);

  const disable = React.useCallback(async () => {
    setBusy(true);
    try {
      const endpoint = await unsubscribeFromPush();
      // Dropped server-side too: an endpoint the browser gave up answers 410
      // forever, and every later message would pay for a request that fails.
      if (endpoint) await api.removePushSubscription(endpoint);
      qc.setQueryData(pushKeys.subscription(), false);
      void syncAppBadge(0);
      // Said outright: the permission still reads "Allow", which looks like the
      // switch did nothing — but no web page can withdraw its own permission.
      toast.success('Message notifications are off for this device', {
        description: isStandalone()
          ? 'The app’s notification permission stays allowed — an app cannot withdraw its own. Turn it off for NobleBid in your device’s settings if you want that too. Nothing will be sent here either way.'
          : 'The site permission in your browser’s settings stays allowed — a page cannot withdraw its own. Nothing will be sent to this device either way.',
      });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [qc]);

  return { state, blockedReason, busy, enable, disable, configured: !!vapidKey };
}
