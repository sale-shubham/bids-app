# API client

Single entry point for all backend calls: the `api` axios instance in `src/lib/api-client.ts`. Handles base-URL resolution, transparent single-flight refresh on `401`, and error-message normalization for the UI.

## Purpose

> **Never call `fetch()` directly to the API and never import raw `axios` in feature code.** Always go through `api` (or the per-feature `*.api.ts` wrappers that use it). The one exception is the internal `axios.post('/auth/refresh')` inside `doRefresh()`, which deliberately bypasses the instance to avoid an interceptor loop.

### Auth model

- **Both access and refresh tokens live in httpOnly cookies set by the backend** (`nb_at`, `nb_rt` — `bids-api` `src/core/http/cookies.ts`). No token is ever read, held, or attached by frontend JS — there is no in-memory token and no `Authorization` header. `withCredentials: true` makes the browser send both cookies automatically on every request (including the refresh call).
- This means a hard reload needs no client-side restore step for the token itself — the cookie is already there. `AuthBootstrap` still calls `fetchMe()` on mount to hydrate `member` into the Zustand store (the cookie alone doesn't tell the UI who's logged in).
- `src/proxy.ts` (edge, see `readme/flows/auth.md`) independently verifies the same `nb_at` cookie with `jose` + a server-only `JWT_SECRET` (must equal the backend's) to redirect by role before a protected page ever renders — this is separate from and in addition to the axios-level refresh flow below.

### Configuration

`NEXT_PUBLIC_ENABLE_SW=1` (optional, dev only, `.env.example`) registers the service worker under `next dev` so Web Push can be tried locally — not an API-client setting, listed here with the other env vars; see `readme/flows/push-notifications.md`.

| Setting | Value | Source |
|---|---|---|
| `baseURL` | `API_ORIGIN` = `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`) — always the API directly | `API_BASE` const, from `src/constants/api.ts` |
| `withCredentials` | `true` | hard-coded (cookie auth) |
| default `Content-Type` | `application/json` | instance headers |

`NEXT_PUBLIC_API_URL` is the **absolute backend origin** (default `http://localhost:4000`), exported once as `API_ORIGIN` (`src/constants/api.ts`) and used by the browser (this instance), `src/proxy.ts`'s server-side refresh and the service worker. There is no same-origin proxy (removed 2026-11-03): the browser calls the API directly — deployed, on the app's own site (e.g. `https://api.dev.example.com`), so the `nb_at`/`nb_rt` cookies stay first-party, and CORS allows the app origin with credentials. Never read `process.env` at a call site — `src/proxy.ts` used to interpolate it raw and would fetch `"undefined/auth/refresh"` if the var was missing. Backend serves routes at the root (no `/api/v1` prefix). Requirements, env vars, LAN testing and troubleshooting: [`readme/flows/api-connection.md`](../flows/api-connection.md). When adding/changing an env var, update `.env.example` and this file (per `docs/DOC_SYNC.md`).

**Image/asset URLs** — uploaded images are stored on S3 and served via CDN. `assetUrl(key)` (`src/lib/assets.ts`) builds the public URL: it passes absolute `http(s)://` values through unchanged (new uploads persist the **full CDN URL** in the DB) and prefixes any bare object key with `NEXT_PUBLIC_UPLOADS_BASE_URL` (fallback: first `NEXT_PUBLIC_IMAGE_ORIGINS` entry). Use it for every `<img src>` rendering a stored key/url — never hardcode `/uploads/${key}`.

## Methods

### `api` (axios instance)

The configured singleton. Use its `.get/.post/.patch/.delete` methods. One interceptor is registered at import time:

**Response interceptor** — passes successful responses through unchanged. On error it inspects `status`, the originating `url`, and the error body's `error.code`:

- If `error.code === 'ACCOUNT_SUSPENDED'` (2026-09-12) — checked **first**, before the 401 handling below (this arrives as a 403, and retrying via refresh wouldn't help since the account itself is suspended, not the token): calls `forceSuspended()` and rejects. See `readme/flows/auth.md`'s `ACCOUNT_SUSPENDED` note.
- If `status === 401` **and** the request has not already been retried (`!original._retry`) **and** the URL does **not** contain `/auth/`:
  1. Mark `original._retry = true` (so a request is retried at most once).
  2. Kick off a **single-flight** refresh: `refreshing ??= doRefresh().finally(() => (refreshing = null))`. Concurrent 401s all `await` the same in-flight `refreshing` promise instead of each firing their own refresh.
  3. If refresh succeeds, **replay** the original request via `api(original)` — no header to set, the backend already rotated the `nb_at`/`nb_rt` cookies via `Set-Cookie` and the browser applies them automatically.
  4. `doRefresh()` returns `'renewed' | 'rejected' | 'unreachable'`. `'renewed'` retries the original request. Only `'rejected'` (the backend refused) calls `forceLogout()`. `'unreachable'` (no response at all, or a 5xx) changes nothing: the original 401 is stamped `authUnreachable` and rejected, so callers retry instead of ending a session over a dropped connection — the installed-PWA cold-start case (see `readme/flows/pwa.md`).
- The `/auth/` exclusion prevents an infinite loop: a 401 from `/auth/login`, `/auth/refresh`, etc. must surface to the caller, not trigger another refresh.
- All other errors (and failed refreshes) are re-thrown via `Promise.reject(error)` so the calling react-query hook lands in `onError`.

### `forceLogout()` (internal, not exported)

Called when `doRefresh()` fails — the refresh token itself is dead (expired/revoked/deactivated member), so the backend's `refresh` controller has already cleared the `nb_at`/`nb_rt` cookies server-side (`bids-api`'s `auth.controller.ts`). This function wipes the client-side mirror of that dead session so nothing stale lingers in memory:

1. **`loggedOut` module-level flag checked/set first, before anything else.** Must come before `queryClient.clear()` — see the gotcha below. Resets to `false` naturally on the next real page load (fresh JS module instance), so it never blocks a legitimate future logout.
2. **Public-route bail-out** — `isPublicRoute(window.location.pathname)` (`PUBLIC_PREFIXES` in `src/constants/routes.ts`, currently `/pages/*`). Those pages are reachable logged-out by design, so a 401 there means "no session", not "session died, eject the user". Clears the zustand store mirror and **returns**: no `queryClient.clear()` (the cache holds the page's own public `['legal-page']` data) and no navigation.
3. `useAuthStore.getState().clear()` — zustand's non-hook access, since this runs inside an axios interceptor, outside any component.
4. `queryClient.clear()` — the same shared singleton instance `<Providers>` passes to `QueryClientProvider` (`src/lib/query-client.ts` exports it directly now, not via a per-mount `useState(makeQueryClient)` factory, precisely so this module can reach it too).
4a. `syncAppBadge(0)` (`src/lib/push.ts`, 2026-11-03) — the dead session took its push subscription with it server-side, so the installed app's icon badge is cleared too. `forceSuspended()` does the same. See `readme/flows/push-notifications.md`.
5. `window.location.href = '/login'` — a hard navigation, not `router.push()` (no router instance available here); guarded by `typeof window === 'undefined'` so it's a no-op if this code ever runs during SSR.

### `forceSuspended()` (internal, not exported, 2026-09-12)

Sibling to `forceLogout()` above, triggered instead of it when `error.code === 'ACCOUNT_SUSPENDED'`. Own `suspended` module-level flag (same idempotency reasoning as `loggedOut`), clears the store + query cache the same way, but hard-navigates to `/suspended` instead of `/login` — a distinct terminal state (member is suspended, not merely logged out) with its own static screen. Does not reuse `forceLogout()`'s public-route bail-out; `/suspended` itself is registered in `PUBLIC_PREFIXES` so it's never redirected away from regardless.

**Gotcha — why the `loggedOut` flag exists, not just a pathname check:** `queryClient.clear()` wipes the cache entry backing `AuthBootstrap`'s still-mounted `['member-me']` `useQuery`, which makes it refetch **immediately and synchronously** — before `window.location.href`'s navigation has actually taken effect (assigning `location.href` doesn't unload the page instantly; JS keeps running/re-rendering until the browser gets around to it). That refetch 401s, its own silent refresh 401s, and `forceLogout()` re-enters — still on the *original* page, not `/login` yet, so a `window.location.pathname === '/login'` guard alone doesn't catch it (an earlier version of this fix tried exactly that and still looped). The `loggedOut` flag makes the whole function idempotent regardless of pathname, which is what actually stops it.

**The actual root cause was one layer up, though:** `AuthBootstrap` used to call `fetchMe()` unconditionally on *every* page, including `/login` itself — so even after the `loggedOut` fix, landing on `/login` with no cookie still 401ed once, refreshed-401ed once, and hard-redirected to `/login` again (a real full-page reload, not a loop, but a needless one). `AuthBootstrap` now skips `fetchMe()` entirely on guest-only routes (`AUTH_ROUTES`, see `readme/flows/auth.md`'s "Auth bootstrap" section), so `forceLogout()`'s guards above are defense-in-depth for other authenticated pages' dead sessions, not the thing that stops the `/login` case — that's fixed by never calling an authenticated endpoint from a guest page at all.

**The same bug then recurred on `/pages/*`** (admin-managed legal copy, `readme/flows/legal-pages.md`), because the route lists were *duplicated* — `proxy.ts` and `AuthBootstrap` each had their own copy, so adding a public route to the edge gate's "falls through untouched" set didn't add it to the client's skip set. A logged-out visitor got the page, then `fetchMe()` 401 → refresh-401 → `forceLogout()` → `/login`. Two changes, both needed:

- All route tables now live in one dependency-free module, `src/constants/routes.ts`, imported by `proxy.ts`, `AuthBootstrap` **and** this file. There is no second copy to forget.
- `PUBLIC_PREFIXES` is a distinct class from `AUTH_ROUTES`: guest-*only* routes redirect a logged-in user away, public routes redirect nobody. `AuthBootstrap` skips `fetchMe()` on both; `forceLogout()` bails without navigating on public ones (step 2 above) so any *other* authenticated call made from a public page can't eject the visitor either.

Net effect: a dead refresh token now behaves exactly like clicking "Log out" (`useLogout` in `use-auth.ts`) — same two cleanup calls — except triggered automatically the moment any authenticated request's silent refresh attempt fails, instead of requiring the user to notice and click something.

### `doRefresh()` (internal, not exported)

Performs the refresh round-trip. Calls `axios.post('${API_BASE}/auth/refresh', {}, { withCredentials: true })` **using bare `axios`** (not the `api` instance — avoids re-entering the interceptor). Returns `true`/`false`; the backend's `Set-Cookie` response headers do the actual work of rotating the token cookies.

- **Returns:** `Promise<boolean>`.

### `isUnreachableError(err)`

Exported. `true` when an error says nothing about whether the member is signed in: no response, a 5xx, or a 401 stamped `authUnreachable` because its refresh could not reach the backend. `AuthBootstrap` uses it to retry `['member-me']` (up to 3, with backoff, plus refetch on focus/reconnect) and to stay uninitialized instead of clearing the member.

### `apiErrorMessage(err, fallback?)`

Normalizes any thrown value into a user-facing string for `toast.error(...)`.

- **Params:**
  - `err: unknown` — the caught error.
  - `fallback?: string` — default `'Something went wrong'`.
- **Returns:** `string`. For an axios error, returns `err.response?.data?.error?.message ?? err.message ?? fallback` (i.e. it reads the backend's structured `{ error: { message } }` envelope first). For any non-axios value, returns `fallback`.
- **Usage:** every mutation `onError` across the feature hooks does `toast.error(apiErrorMessage(e))` (some pass a feature-specific fallback, e.g. `apiErrorMessage(e, 'Payment failed')`).

## Response envelope conventions

The backend wraps responses, and feature `*.api.ts` files unwrap them in **two distinct shapes** — match the one the endpoint uses:

- **Single object / detail:** `res.data.data` — e.g. `fetchMe`, `fetchMySubscription`, `createListing`.
- **Offset-paginated list:** the **whole** `res.data`, typed as `{ data: T[]; meta: { total, page, pageSize, totalPages } }` — e.g. `fetchMembers`, `fetchMyListings`, `fetchReviewListings`, `fetchMemberEdits`, `fetchAdminSubscriptions`. UI via `<ListPagination>`.
- **Cursor-paginated list:** the **whole** `res.data`, typed as `{ data: T[]; meta: { nextCursor: string | null } }` — the buyer catalog **search** (`meta.total` too) and `fetchAuditLogs` (backend route pending). 

> **Offset** (`page`/`pageSize` → numbered `ListPagination`) is the standard for all admin/member list tables and feeds. **Keyset** (`meta.nextCursor`) remains only on full-text catalog search. Search/filter happens server-side; `?q=`/`search`/`status` params pass through. See `docs/PAGINATION.md`.

## Usage

```ts
import { api, apiErrorMessage } from '@/lib/api-client';

// GET with query params
const res = await api.get('/listings/mine', { params: { status, cursor } });
return res.data as { data: MyListing[]; meta: { nextCursor: string | null } };

// POST returning a single object
const created = (await api.post('/listings', payload)).data.data;

// multipart upload (override Content-Type)
const form = new FormData();
form.append('file', file);
await api.post('/uploads/image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
```

## Notes

- `api` holds no token state at all now — both tokens are httpOnly cookies the backend manages via `Set-Cookie`. `auth.api.verifyOtp()`/`signupVerify()`/`logout()` just call the endpoint and return/ignore the body; `use-auth`'s `useVerifyOtp`/`useSignupVerify` write the member into the Zustand store.
- `src/lib/device-info.ts` (`getDeviceInfo()`) is a separate, tiny module — not part of `api-client.ts` — that parses `navigator.userAgent` (`ua-parser-js`) into `{ browser, os, device, type }`, sent by `auth.api.ts`'s `verifyOtp`/`signupVerify` as `deviceInfo`. The `deviceId` used for the backend's 2-device-per-Member session cap is server-generated/reused via an httpOnly `dvid` cookie (not this module, not localStorage). See `readme/flows/auth.md`.
- `AuthBootstrap` (`src/providers/auth-bootstrap.tsx`) calls `fetchMe()` (`GET /members/me`) on mount and route change — **except** on `AUTH_ROUTES` (`/login`, `/signup`, `/`) and `PUBLIC_PREFIXES` (`/pages/*`), where the query is disabled entirely. The httpOnly cookies survive a reload on their own; if the access cookie happens to be expired, that request 401s, the response interceptor silently refreshes, and `fetchMe()` is replayed. The member is then written to the store and `initialized` is set. `AuthBootstrap` also does `void api;` to guarantee the module (and thus its interceptor) is imported.

### Reference files

- `src/lib/api-client.ts` (canonical)
- `src/providers/auth-bootstrap.tsx`
- `src/features/auth/auth.api.ts`
- `src/features/*/*.api.ts` (per-feature wrappers)
- `src/proxy.ts` — edge-side counterpart, verifies the same `nb_at` cookie independently (see `readme/flows/auth.md`)

*Last updated: 2026-11-03 (`/api` proxy removed — `API_ORIGIN` is `NEXT_PUBLIC_API_URL` for every caller; `NEXT_PUBLIC_BROWSER_API_URL` and `API_SERVER_ORIGIN` gone)*
*Previously: 2026-11-03 (`forceLogout()`/`forceSuspended()` clear the app-icon badge; `NEXT_PUBLIC_ENABLE_SW` noted)*
*Previously: 2026-10-19 (`API_ORIGIN` = `NEXT_PUBLIC_BROWSER_API_URL` when set — deployed browsers call the API directly, skipping the proxy's extra serverless hop/cold start; `/api` proxy kept for local/LAN dev)*
*Previously: 2026-09-24 (`baseURL` is `/api`, was `/api/backend` — see `readme/flows/api-proxy.md`)*
*Previously: 2026-09-24 (`baseURL` is always `/api/backend`: the proxy is now a route handler in dev and production, not a dev-only rewrite — see `readme/flows/api-proxy.md`. `DEV_API_PROXY_PATH` removed.)*
*Previously: 2026-09-24 (ported from `unikorncoatings_app`: `doRefresh()` is tri-state and only `'rejected'` calls `forceLogout()`; new exported `isUnreachableError()`; `baseURL` from `API_ORIGIN` in new `src/constants/api.ts` (`API_SERVER_ORIGIN`, `DEV_API_PROXY_PATH`, `API_ORIGIN`); dev-only `/api/backend` proxy; refresh `console.log`/`console.error` removed)*
*Previously: 2026-09-12 (new `forceSuspended()` + `ACCOUNT_SUSPENDED` interceptor branch — see the new section above and `readme/flows/auth.md`)*
*Previously: 2026-07-31 (`forceLogout()` gained a `PUBLIC_PREFIXES` bail-out — it no longer navigates when the 401 happened on a public page like `/pages/*`; route tables de-duplicated into `src/constants/routes.ts`, shared with `proxy.ts` + `AuthBootstrap`, since the duplication is what let `/pages/*` be public at the edge but still eject to `/login` client-side)*
*Previously: 2026-07-24 (wallet/points removed — updated the response-envelope example list, which cited `fetchBalance`/`fetchLedger`/`fetchUnlocked`/`fetchAdminTransactions`, all now gone)*
*Previously: 2026-07-23 (root-caused the `/login` redirect loop to `AuthBootstrap` calling `fetchMe()` unconditionally on every page — it now skips the call entirely on `GUEST_ROUTES`, see `readme/flows/auth.md`; `forceLogout()`'s `loggedOut` flag stays as defense-in-depth for dead sessions on authenticated pages)*
*Previously: 2026-07-23 (fixed the `me`/`refresh` 401 loop for real this time: a pathname-based guard wasn't enough since `queryClient.clear()` retriggers `AuthBootstrap`'s `useQuery` synchronously, before the redirect's navigation takes effect and while still on the original page — replaced with a module-level `loggedOut` idempotency flag, set before any cleanup runs)*
*Previously: 2026-07-23 (first attempt: `forceLogout()` no-op'd its redirect if already on `/login` — insufficient, see above)*
*Previously: 2026-07-23 (added `forceLogout()` — a failed silent refresh now clears the Zustand auth store + react-query cache and hard-redirects to `/login`, instead of just rejecting the original request and leaving stale state in memory; `src/lib/query-client.ts` now exports a shared `queryClient` singleton instead of only a `makeQueryClient()` factory, so this module and `<Providers>` reference the same instance)*
*Previously: 2026-07-22 (removed the in-memory access token / `Authorization: Bearer` header entirely — the backend already sets `nb_at`/`nb_rt` as httpOnly cookies and `withCredentials` was already sending them, so the manual header was dead weight; `src/proxy.ts` now verifies the real `nb_at` cookie via `jose`, replacing an earlier client-set role-hint cookie; no separate `proxy.ts` — this project is on Next.js 15, which only auto-runs `proxy.ts`)*
