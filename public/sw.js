/* NobleBid service worker — static-asset caching only.
 *
 * Navigations are deliberately NOT intercepted. Auth lives in src/proxy.ts,
 * which gates member/admin pages with a 307 redirect and attaches the refreshed `nb_at`
 * cookie to that redirect. A navigation request carries `redirect: 'manual'`, so
 * passing it back through fetch() in here resolves to an `opaqueredirect`
 * response whose header list is filtered empty — the Set-Cookie is dropped and
 * the session dies silently. A browser tab hid the bug, because a reload reaches
 * the network before this worker has claimed the document; an installed PWA
 * always launches through the active worker and has no bypass gesture, which is
 * why only the installed app kept losing its token. Offline state is surfaced by
 * <OfflineBanner> (src/components/common/offline-banner.tsx) instead of by a
 * cached shell.
 *
 * Everything this worker does cache is content-hashed (/_next/static) or
 * versioned, and the HTML always comes from the network, so it can only ever
 * reference URLs that still exist on the server — cache-first is safe here.
 */
const CACHE_PREFIX = 'noblebid-';
const FALLBACK_CACHE = `${CACHE_PREFIX}fallback`;

// One entry, holding when a notification last made a sound (showOne() below).
// A cache of its own because it must survive the `activate` sweep that drops
// the previous deploy's assets, and because a service worker is killed between
// pushes, so there is no variable that outlives the notification that wrote it.
const PUSH_CACHE = `${CACHE_PREFIX}push-state`;

// Registered with `dev=1` (`/sw.js?api=…&dev=1`) by <ServiceWorkerRegister> when
// NEXT_PUBLIC_ENABLE_SW is set under `next dev`. Push needs a worker, and push
// is the one thing worth testing locally; caching under `next dev` is not — it
// pins the un-hashed dev chunks and breaks hot reload. So the dev worker keeps
// the push handlers and gives up the cache.
const DEV = new URL(self.location.href).searchParams.has('dev');

// Assets worth keeping. /sw.js is excluded on purpose: caching the worker would
// make a broken one unreplaceable, which is the same failure the no-store header
// in next.config.ts guards against.
const STATIC_EXT = /\.(?:css|js|mjs|woff2?|png|jpe?g|svg|ico|webp|avif)$/;

function isStaticAsset(pathname) {
  if (pathname === '/sw.js') return false;
  return pathname.startsWith('/_next/static') || STATIC_EXT.test(pathname);
}

// The cache name is tied to the deployed buildId (public/version.json, rewritten
// by every build) so `activate` drops the previous deploy's entries instead of
// letting them accumulate forever — the old fixed 'v1' name never changed, so
// nothing was ever evicted. Resolved once and reused; falls back to a fixed name
// when version.json is unreachable.
let cacheNamePromise;
function cacheName() {
  cacheNamePromise ??= fetch('/version.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => `${CACHE_PREFIX}${data?.buildId ?? data?.version ?? 'fallback'}`)
    .catch(() => FALLBACK_CACHE);
  return cacheNamePromise;
}

self.addEventListener('install', (event) => {
  // Nothing to precache now that there is no navigation fallback. Resolve the
  // cache name here so `activate` never has to wait on the network.
  event.waitUntil(cacheName());

  // Static Routing API (Chrome 123+): navigations bypass this worker entirely,
  // instead of starting it only for the fetch handler to fall back. Chrome's
  // ServiceWorkerAutoPreload regressed in M143 for exactly that case on an
  // installed app's cold start (crbug.com/466790291). Feature-detected, so other
  // browsers keep relying on the `mode === 'navigate'` early return below.
  if (event.addRoutes) {
    event.addRoutes({ condition: { requestMode: 'navigate' }, source: 'network' }).catch(() => {});
  }

  // This version DOES skipWaiting, unlike the previous one, and the reason is
  // specific: the worker it replaces breaks authentication, so leaving it in
  // control until the user happens to accept an update prompt just prolongs the
  // bug. It is also safe to do here in a way it was not before — this worker
  // never touches navigations and only ever caches content-hashed assets, so
  // taking over mid-session cannot interrupt a request or mix two builds.
  // <PwaUpdatePrompt> still drives the visible "new version" reload via the
  // UPDATE_APP message below, which also clears caches.
  self.skipWaiting();
});

// Client-driven update: the update prompt tells the waiting worker to take over.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'UPDATE_APP') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const current = await cacheName();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== current && k !== PUSH_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (DEV) return; // see the DEV note at the top of this file
  if (request.method !== 'GET') return;

  // Navigations go straight to the network — see the note at the top of this
  // file. Without this the auth middleware's redirect cookies are lost.
  if (request.mode === 'navigate') return;

  const url = new URL(request.url);
  // Only handle same-origin. Cross-origin (backend API, S3) passes straight through.
  if (url.origin !== self.location.origin) return;

  // version.json backs update detection — a cached copy means a new deploy is
  // never noticed.
  if (url.pathname === '/version.json') return;

  if (!isStaticAsset(url.pathname)) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const res = await fetch(request);
      // Only a real same-origin 200 is worth keeping — an error or opaque
      // response would otherwise be pinned for the life of the deploy.
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        const cache = await caches.open(await cacheName());
        await cache.put(request, copy);
      }
      return res;
    })(),
  );
});

/* ---------------------------------------------------------------------------
 * Push notifications — new DMs while the app is closed
 * (readme/flows/push-notifications.md)
 *
 * The badge on the installed app's icon is the Badging API (setAppBadge), and
 * it is set from in here because this is the only code that runs when a push
 * arrives with the app closed — which is the whole point. The number comes
 * from the server inside the payload (`badgeCount`: the member's unread total
 * across every notification), so the worker never has to ask.
 *
 * showNotification() is NOT optional. Chrome only grants `userVisibleOnly`
 * subscriptions, and a push handler that shows nothing gets the browser's own
 * "this site was updated in the background" notice instead — repeated, the
 * permission is revoked. The one exception is below (alreadyWatching).
 * ------------------------------------------------------------------------- */

// Matches the API's push payload (bids-api src/modules/push/push.service.ts):
// { type: 'outbid' | 'auction-won' | 'ending-soon' | ..., auctionId, title, body, url?, badgeCount }.
function parsePush(event) {
  try {
    return event.data ? event.data.json() : null;
  } catch {
    // Not ours, or not JSON. Still worth a notification — dropping it silently
    // would leave a browser-generated one in its place.
    return null;
  }
}

function setBadge(count) {
  // Chrome/Edge on desktop and Android, and iOS 16.4+ once added to the Home
  // Screen. Absent in Firefox and in a plain tab.
  if (!('setAppBadge' in self.navigator)) return Promise.resolve();
  const task = count > 0 ? self.navigator.setAppBadge(count) : self.navigator.clearAppBadge();
  // Rejects when the app is not installed. Not an error worth surfacing.
  return Promise.resolve(task).catch(() => {});
}

/**
 * Whether somebody is already looking at the thread this message belongs to.
 * The banner is then skipped — they can see the message arrive — while the
 * badge still updates. Allowed because Chrome only substitutes its own notice
 * when the handler shows nothing AND the site has no visible window; here
 * there is one by definition.
 *
 * Compares paths only, and requires `visibilityState === 'visible'`: a tab
 * parked on the thread behind twelve others is not somebody looking at it.
 */
async function alreadyWatching(url) {
  let target;
  try {
    target = new URL(url, self.location.origin).pathname;
  } catch {
    return false;
  }
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return windows.some((client) => {
    if (client.visibilityState !== 'visible') return false;
    try {
      return new URL(client.url).pathname === target;
    } catch {
      return false;
    }
  });
}

/**
 * Tells open pages the unread total changed. Usually redundant with the
 * WebSocket (auction socket) — but a suppressed banner plus a socket that
 * happens to be mid-reconnect would otherwise leave the person with no signal
 * at all. useAppBadge() listens for it.
 */
async function tellPages(unread) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windows) client.postMessage({ type: 'NOTIFICATION_COUNT', unread });
}

// One row per auction: a new
// message in the same thread replaces that thread's row (same tag) instead of
// stacking a second one. Different threads are different rows, which the OS
// bundles by app on its own.
const TAG_PREFIX = 'noblebid-auction:';
const isOurTag = (tag) => typeof tag === 'string' && tag.startsWith(TAG_PREFIX);

// Only the first row inside this window makes a sound; the rest land silent —
// a burst of messages is not a burst of buzzes.
const ALERT_WINDOW_MS = 60_000;
const LAST_ALERT_KEY = '/__push/last-alert';

const ICONS = {
  // Large icon, right of the row. Round, because Android does not round a web
  // notification's large icon for us — the square tile stayed a square.
  icon: '/icons/notification-192x192.png',
  // Small icon, status bar and left of the row. Android throws this image's
  // colours away and draws a white shape from its ALPHA channel, so an opaque
  // tile came out as a white square. This is the "NobleBid" mark as alpha only.
  // Both from scripts/generate-notification-icons.cjs.
  badge: '/icons/badge-96x96.png',
};

/**
 * Whether this row is the one that buzzes. The timestamp lives in PUSH_CACHE
 * because the worker is killed between pushes. Two pushes handled in the same
 * instant can both alert — one extra buzz beats a silent notification.
 */
async function shouldAlert() {
  try {
    const cache = await caches.open(PUSH_CACHE);
    const res = await cache.match(LAST_ALERT_KEY);
    const last = res ? Number(await res.text()) || 0 : 0;
    const now = Date.now();
    if (now - last < ALERT_WINDOW_MS) return false;
    await cache.put(LAST_ALERT_KEY, new Response(String(now)));
    return true;
  } catch {
    return true; // storage refused — no throttle rather than no sound
  }
}

async function forgetPushState() {
  try {
    await caches.delete(PUSH_CACHE);
  } catch {
    // Nothing depends on it — the window only ever silences a row.
  }
}

async function showOne(payload, url) {
  const silent = !(await shouldAlert());
  return self.registration.showNotification(payload.title || 'NobleBid', {
    ...ICONS,
    body: payload.body || 'You have a new notification.',
    tag: `${TAG_PREFIX}${payload.auctionId || 'unknown'}`,
    // A replaced row (same thread) is silent by default; `renotify` makes it
    // buzz again — but never together with `silent`, which Chrome rejects.
    renotify: !silent,
    silent,
    data: { url },
  });
}

self.addEventListener('push', (event) => {
  const payload = parsePush(event) ?? {};
  const badge = Number(payload.badgeCount) || 0;
  const url = payload.url || (payload.auctionId ? `/auctions/${payload.auctionId}` : '/watchlist');

  event.waitUntil(
    (async () => {
      const watching = payload.auctionId ? await alreadyWatching(url) : false;
      await Promise.all([setBadge(badge), tellPages(badge), watching ? Promise.resolve() : showOne(payload, url)]);
    })(),
  );
});

/* ---------------------------------------------------------------------------
 * The browser replaced the subscription underneath us
 *
 * A PushSubscription is not permanent: the push service can retire an endpoint
 * (Chrome rotates them; a browser update or profile repair does the same) and
 * announces it with `pushsubscriptionchange` and nothing else. Without this
 * handler push for that device is silently dead — the permission still reads
 * "allowed" and the app looks subscribed.
 *
 * The event only reaches the worker, often with no page open. Calls go straight
 * to the API host, whose origin the page passes as `?api=` when it registers
 * this file (SW_URL in src/components/common/sw-register.tsx — a static file
 * cannot read NEXT_PUBLIC_API_URL). This file's CSP (next.config.ts) lists that
 * origin in `connect-src`; the API host shares the app's site, so the
 * `SameSite=Lax` `nb_at` cookie rides along, and its CORS allows this origin
 * with credentials. A 15-minute access token, so one refresh-and-retry is part
 * of the job.
 *
 * Backed up if it fails anyway: the app's usePushSubscription() re-posts the
 * browser's subscription on every open, and the API deletes any endpoint its
 * push service answers 404/410 for. That is also what happens under a worker
 * registered before `?api=` existed: API is '' and resubscribe() gives up.
 * ------------------------------------------------------------------------- */

const API = new URL(self.location.href).searchParams.get('api') || '';

// One retry behind a refresh, like the page's axios interceptor. `run` is
// re-invoked rather than the Response reused — a body can only be read once.
async function withAuth(run) {
  const res = await run();
  if (res.status !== 401) return res;
  const refreshed = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!refreshed.ok) return res;
  return run();
}

const apiPost = (path, body) =>
  withAuth(() =>
    fetch(`${API}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

// Same conversion as src/lib/push.ts — duplicated because a classic service
// worker has no module graph to import from.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = self.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

// Public endpoint (no auth) — only needed when the event hands over neither a
// new subscription nor the old one's key, which is the Chrome case.
async function serverVapidKey() {
  try {
    const res = await fetch(`${API}/push/vapid-public-key`, { credentials: 'include' });
    if (!res.ok) return null;
    const key = (await res.json())?.data?.publicKey;
    return key ? urlBase64ToUint8Array(key) : null;
  } catch {
    return null;
  }
}

async function resubscribe(event) {
  if (!API) return;
  // `oldSubscription` is spec'd but not universal (Firefox yes, Chrome has
  // fired the event bare). Null just leaves the dead row to the API's pruning.
  const oldEndpoint = event.oldSubscription?.endpoint ?? null;
  let subscription = event.newSubscription ?? (await self.registration.pushManager.getSubscription());

  if (!subscription) {
    const key = event.oldSubscription?.options?.applicationServerKey ?? (await serverVapidKey());
    if (!key) return;
    try {
      subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    } catch {
      // Usually the event fired *because* the permission was revoked; the page
      // reflects that itself (onPermissionChange() in src/lib/push.ts).
      return;
    }
  }

  try {
    // New row first, old row second: a failure in between leaves a dead
    // endpoint the API prunes later; the other order would leave no row at all.
    const saved = await apiPost('/push/subscribe', subscription.toJSON());
    if (!saved.ok) return;
    if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
      await apiPost('/push/unsubscribe', { endpoint: oldEndpoint });
    }
  } catch {
    // Offline, or signed out. The next app open re-posts this subscription.
  }
}

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(resubscribe(event));
});

/**
 * Tapping a row opens its thread — and opening the thread is what marks it
 * read (the app's auto mark-read), so nothing is posted from here. Focus a
 * window already on this origin rather than opening a second: an installed
 * PWA has a single window, and `openWindow` in it would launch the browser.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(openTarget(event.notification.data?.url || '/auctions'));
});

async function openTarget(target) {
  const url = new URL(target, self.location.origin);
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    if (new URL(client.url).origin !== url.origin) continue;
    await client.focus();
    // navigate() is unavailable on a client this worker does not control.
    if ('navigate' in client) await client.navigate(url.href).catch(() => {});
    return;
  }
  await self.clients.openWindow(url.href);
}

// The page owns the badge while it is open (syncAppBadge / closeThreadNotification
// in src/lib/push.ts), through here so one piece of code draws it.
self.addEventListener('message', (event) => {
  const data = event.data;

  // A thread was read in the app: its row is stale, take it down.
  if (data?.type === 'CLEAR_THREAD' && data.conversationId) {
    event.waitUntil(
      (async () => {
        const tag = `${TAG_PREFIX}${data.conversationId}`;
        for (const shown of await self.registration.getNotifications({ tag })) shown.close();
      })(),
    );
    return;
  }

  if (data?.type !== 'SET_BADGE') return;
  const count = Number(data.count) || 0;
  event.waitUntil(
    (async () => {
      await setBadge(count);
      // Nothing unread any more — here or on another device (the socket's
      // `dm:read` reaches every device). Rows still standing would be for
      // messages already read. Only this app's rows (isOurTag).
      if (count > 0) return;
      for (const shown of await self.registration.getNotifications()) {
        if (isOurTag(shown.tag)) shown.close();
      }
      await forgetPushState();
    })(),
  );
});
