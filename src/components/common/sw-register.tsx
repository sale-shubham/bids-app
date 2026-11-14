'use client';
import * as React from 'react';
import { API_ORIGIN } from '@/constants/api';

/**
 * The URL the worker is registered under.
 *
 * `?api=` hands the worker the API origin: `public/sw.js` is a static file
 * with no build step, so it cannot read NEXT_PUBLIC_API_URL itself, and its
 * `pushsubscriptionchange` handler calls the API directly (there is no
 * same-origin `/api` proxy). The value is fixed per build, so the URL — and
 * the registration — stays the same between visits.
 *
 * Under `next dev` the worker is off by default — it would cache the un-hashed
 * dev chunks and break hot reload — but push notifications cannot be tried at
 * all without one, and localhost is a secure context, so
 * `NEXT_PUBLIC_ENABLE_SW=1` turns it on and the `dev=1` marker tells
 * `public/sw.js` to keep its push handlers and skip its fetch caching
 * entirely. See readme/flows/push-notifications.md.
 */
const DEV_SW_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SW === '1';
export const SW_URL = `/sw.js?api=${encodeURIComponent(API_ORIGIN)}${process.env.NODE_ENV === 'production' ? '' : '&dev=1'}`;

// Whether a worker is registered at all in this environment. Anything that
// needs one — the push helpers in src/lib/push.ts — asks here rather than
// re-deriving the rule.
export const swEnabled = (): boolean => process.env.NODE_ENV === 'production' || DEV_SW_ENABLED;

// Registers the worker once on mount (client only). Kept out of the SW file
// itself so the worker stays framework-agnostic. No-op if unsupported.
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (!swEnabled()) return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      // updateViaCache: 'none' — the default ('imports') lets the browser read
      // /sw.js itself back out of the HTTP cache, so a stale worker survives
      // deploys. Paired with the no-store header on /sw.js in next.config.ts.
      // Scope is explicit to match the manifest's scope: '/'.
      navigator.serviceWorker.register(SW_URL, { scope: '/', updateViaCache: 'none' }).catch((err) => {
        // Non-fatal — the app works online without a worker. But no worker
        // also means no push and no app-icon badge, so say so in development.
        if (process.env.NODE_ENV !== 'production') console.error('[sw] registration failed', err);
      });
    };

    // A `load` listener added after `load` has already fired never runs — and
    // by the time React has hydrated and reached this effect it often has
    // (always, under `next dev`). If the page is already loaded there is
    // nothing left to compete with, so register now.
    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}
