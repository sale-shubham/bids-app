// Web Push + app-icon badge helpers for new-DM notifications. Browser-only —
// every export guards on `typeof window`. The flow and its limits are written
// up in readme/flows/push-notifications.md. Ported from unikorncoatings_app's
// src/lib/push.ts, including the fixes it needed in production.

import { swEnabled } from '@/components/common/sw-register';
import { isStandalone } from '@/lib/pwa';

export type PushPermission = 'default' | 'granted' | 'denied';

/**
 * Whether this browser can take a push subscription at all.
 *
 * All four are needed: a service worker (also a secure-context check —
 * `localhost` counts, a LAN IP over plain http does not), the Push API, the
 * Notification API, and a worker actually registered in this environment. iOS
 * reports the APIs in a Safari tab but only ever delivers to an app added to
 * the Home Screen, which `pushBlockedReason()` explains rather than hides.
 */
export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && swEnabled();
}

export function pushPermission(): PushPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
  return Notification.permission as PushPermission;
}

/**
 * Why the member cannot turn notifications on, in their words — or null when
 * they can. Every one of these looks identical from the switch's side (nothing
 * happens), and the iOS case is a step to take, not a limit to give up on.
 */
export function pushBlockedReason(): string | null {
  if (typeof window === 'undefined') return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = isStandalone();

  if (ios && !standalone) {
    return 'On iPhone and iPad, add NobleBid to the Home Screen first — Safari can only send notifications to an installed app.';
  }
  if (!('serviceWorker' in navigator)) {
    return 'This browser cannot receive notifications. They need a secure connection (https) — a plain IP address on the local network will not work.';
  }
  if (!('PushManager' in window) || !('Notification' in window)) {
    return 'This browser does not support notifications.';
  }
  if (!swEnabled()) return 'Notifications are switched off in this environment.';
  if (pushPermission() === 'denied') {
    // Directions to the screen the member is actually in front of: the
    // installed app has no address bar or padlock to reach site settings from.
    return standalone
      ? 'Notifications are blocked for this app. Allow them for NobleBid in your device’s settings, then try again.'
      : 'Notifications are blocked for this site. Allow them in the browser’s site settings, then try again.';
  }
  return null;
}

// VAPID public keys travel as base64url; PushManager.subscribe() wants raw
// bytes. The explicit `new ArrayBuffer(...)` backing store matters:
// `applicationServerKey` only accepts a view over a plain ArrayBuffer, and the
// default Uint8Array type also admits SharedArrayBuffer.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * The active registration, or null when this browser has none.
 *
 * `navigator.serviceWorker.ready` alone is wrong: it never rejects, so with
 * nothing registered it hangs forever. `getRegistration()` settles at once
 * either way, so it decides first and `ready` is only awaited once there is
 * something to wait for. (A `next dev` started before NEXT_PUBLIC_ENABLE_SW
 * was set has no worker — Next inlines NEXT_PUBLIC_* at compile time.)
 */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) return null;
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/**
 * The outcome of trying to subscribe — a result, not `PushSubscription | null`,
 * because the failures are not interchangeable: a refused permission is the
 * member's decision, a missing service worker is our bug.
 */
export type SubscribeResult = { ok: true; subscription: PushSubscription } | { ok: false; reason: string };

/**
 * Asks for permission (if not already answered) and subscribes.
 * `userVisibleOnly: true` is not a choice: Chrome refuses a subscription
 * without it, which is also why the worker shows a notification for every push.
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: 'This browser cannot receive notifications.' };
  if (!vapidPublicKey) return { ok: false, reason: 'Notifications are not set up on the server yet.' };

  // Before the permission prompt, not after: asking to allow notifications and
  // then failing for an unrelated reason spends the one prompt the browser
  // grants, and a denied permission cannot be asked for again.
  const reg = await registration();
  if (!reg) {
    return {
      ok: false,
      reason: 'Notifications could not start on this device — the background service is not running. Reload the page and try again.',
    };
  }

  const permission = pushPermission() === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'Notifications were not allowed.' };

  const wanted = urlBase64ToUint8Array(vapidPublicKey);
  const existing = await reg.pushManager.getSubscription();
  // A subscription taken under a previous VAPID key cannot be sent to, so it is
  // dropped rather than reused — what makes a rotated key pair recoverable.
  if (existing) {
    const same = existing.options.applicationServerKey;
    if (same && sameKey(new Uint8Array(same), wanted)) return { ok: true, subscription: existing };
    await existing.unsubscribe().catch(() => {});
  }

  const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: wanted });
  return { ok: true, subscription };
}

function sameKey(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/** Gives up this browser's subscription. Returns the endpoint that was dropped. */
export async function unsubscribeFromPush(): Promise<string | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  const { endpoint } = sub;
  await sub.unsubscribe().catch(() => {});
  return endpoint;
}

/**
 * The number on the installed app's icon — the member's unread DM total.
 *
 * Painted from two places: the service worker when a push lands with the app
 * shut (from the payload's badgeCount), and from here whenever the page learns
 * the real count. Written through the worker so one piece of code owns the
 * badge (it also takes stale notification rows down at 0), with a direct call
 * as the fallback for a page no worker controls yet.
 */
export async function syncAppBadge(count: number): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const controller = navigator.serviceWorker?.controller;
    if (controller) {
      controller.postMessage({ type: 'SET_BADGE', count });
      return;
    }
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0) await nav.setAppBadge?.(count);
    else await nav.clearAppBadge?.();
  } catch {
    // Not installed, or no Badging API (Firefox). Nothing to paint.
  }
}

/** A thread was just read here: take its notification row down, if one is showing. */
export function closeThreadNotification(conversationId: string): void {
  if (typeof window === 'undefined') return;
  navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_THREAD', conversationId });
}

/**
 * Calls back whenever the browser's own notification permission changes.
 *
 * `Notification.permission` is a plain getter with no event, so nothing
 * re-renders when somebody flips it in site settings — the switch would keep
 * showing the permission the page loaded with until a hard reload. Two
 * sources, because neither covers every browser:
 *  - `navigator.permissions.query({ name: 'notifications' })` → `change`,
 *    live, including in the background (Chrome, Edge, Firefox);
 *  - `visibilitychange` + `focus` for the rest, notably an installed iOS app,
 *    whose permission changes in iOS Settings while the app is away.
 * Both compare against the last value seen, so coming back to the tab does not
 * re-run the subscription check on every focus.
 */
export function onPermissionChange(fn: (permission: PushPermission) => void): () => void {
  if (typeof window === 'undefined' || !('Notification' in window)) return () => {};

  let last = pushPermission();
  let disposed = false;

  const check = () => {
    const now = pushPermission();
    if (now === last) return;
    last = now;
    fn(now);
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') check();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', check);

  let status: PermissionStatus | null = null;
  navigator.permissions
    ?.query({ name: 'notifications' as PermissionName })
    .then((result) => {
      if (disposed) return;
      status = result;
      result.addEventListener('change', check);
    })
    .catch(() => {
      // Safari below 16 rejects for 'notifications' — the listeners above cover it.
    });

  return () => {
    disposed = true;
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', check);
    status?.removeEventListener('change', check);
  };
}
