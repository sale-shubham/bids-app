# API client

Single entry point for all browser-side backend calls: the `api` axios instance in `src/lib/api-client.ts`. It sets the base URL, does a transparent single-flight refresh on `401`, ends dead or suspended sessions, and turns API errors into UI text.

## Purpose

> **Never call `fetch()` to the API and never create another axios instance in feature code.** Always go through `api` (or the per-feature `*.api.ts` wrappers that use it). Deliberate exceptions:
> - `doRefresh()` posts to `/auth/refresh` with bare `axios`, so the refresh call cannot re-enter the interceptor.
> - `src/features/uploads/uploads.api.ts` PUTs file bytes to the presigned S3 URL with `fetch` / XHR, not `api`: extra headers or credentials would break the S3 signature. (It imports `axios` only for `axios.isAxiosError`.)
> - Server components use `serverFetch` / `serverGet` from `src/lib/server-api.ts` (see below), never `api`.

### Auth model

- **Both tokens live in httpOnly cookies set by the backend** (`nb_at` access, `nb_rt` refresh). Frontend JS never reads, holds or attaches a token: there is no `Authorization` header. `withCredentials: true` makes the browser send both cookies on every request, including the refresh call.
- A hard reload needs no token restore step, the cookies are already there. `AuthBootstrap` still runs `fetchMe()` (`GET /members/me`, query key `['me']`) to put the member into the zustand store, because the cookie alone does not tell the UI who is logged in. See `readme/methods/stores.md`.
- `src/proxy.ts` (edge) separately verifies the same `nb_at` cookie with `jose` and the server-only `JWT_SECRET` (must equal the backend's), refreshes server-to-server via `POST ${serverApiOrigin()}/auth/refresh` when it has expired, and redirects by role before a protected page renders. That is independent of, and in addition to, the axios-level refresh below.

### Configuration

| Setting | Value | Source |
|---|---|---|
| `baseURL` | `API_ORIGIN` | `src/constants/api.ts` |
| `withCredentials` | `true` | hard-coded (cookie auth) |
| default `Content-Type` | `application/json` | instance headers |
| timeout | none | pass `{ timeout }` per call when needed (e.g. `verifyPayment`) |

`src/constants/api.ts` exports:

- `API_ORIGIN`: `NEXT_PUBLIC_API_URL` with trailing slashes dropped, default `http://localhost:4000`. Used by the axios instance and passed to the service worker as `/sw.js?api=` (`src/components/common/sw-register.tsx`). Never read `process.env.NEXT_PUBLIC_API_URL` at a call site.
- `API_IS_RELATIVE`: `true` when `API_ORIGIN` is a same-origin path such as `/api` (proxy mode).
- `serverApiOrigin()`: the absolute origin for server-side code (RSC fetches, `src/proxy.ts`). Returns `API_ORIGIN` when it is absolute; in proxy mode returns `API_PROXY_TARGET` (warns and falls back to `http://localhost:4000` if that is unset). Never import it into client code.

Two deployment modes (details in `readme/flows/deployment.md`):

1. **Custom domain**: `NEXT_PUBLIC_API_URL` is the API's absolute URL on the app's own site (e.g. `https://api.example.com`), so the auth cookies stay first-party. The API's CORS must allow the app origin with credentials.
2. **Same-origin proxy**: `NEXT_PUBLIC_API_URL=/api` plus server-only `API_PROXY_TARGET` (the raw API Gateway URL). `next.config.ts` rewrites `/api/:path*` to `${API_PROXY_TARGET}/:path*`.

The backend serves routes at the root (`/auth/login`, `/auctions`, ...), with no `/api/v1` prefix.

Environment variables (`.env.example`). `NEXT_PUBLIC_*` values are inlined at build time. When adding or changing one, update `.env.example` and this table (`docs/DOC_SYNC.md`).

| Variable | Scope | Used by |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | browser | `API_ORIGIN` (axios, service worker), `next.config.ts` |
| `API_PROXY_TARGET` | server only, optional | `next.config.ts` `/api` rewrite, `serverApiOrigin()` |
| `JWT_SECRET` | server only | `src/proxy.ts` (`jose` verify of `nb_at`) |
| `NEXT_PUBLIC_SITE_URL` | browser | `SITE_URL` in `src/lib/site.ts` (canonical links, OG, sitemap, robots); live `https://bidsapp.shubsale.in` |
| `NEXT_PUBLIC_WEBSITE_URL` | browser | `WEBSITE_URL` / `websiteUrl()` in `src/constants/website.ts` (absolute links to the website's About / How it works / Contact); default `http://localhost:3000`, live `https://noblebids.shubsale.in` |
| `NEXT_PUBLIC_IMAGE_ORIGINS` | browser | `next.config.ts` `next/image` remote hosts; fallback base for `assetUrl()` |
| `NEXT_PUBLIC_UPLOADS_BASE_URL` | browser | base URL for `assetUrl()` |
| `NEXT_PUBLIC_ENABLE_SW` | dev only, optional | `=1` registers the service worker under `next dev` (`sw-register.tsx`), see `readme/flows/push-notifications.md` |

**Image URLs.** `assetUrl(key)` (`src/lib/assets.ts`) passes absolute `http(s)://` values through unchanged (the presign response's `url`, which is what new uploads store) and prefixes a bare object key with `NEXT_PUBLIC_UPLOADS_BASE_URL` (fallback: the first `NEXT_PUBLIC_IMAGE_ORIGINS` entry). Use it when rendering a stored key; never hardcode a CDN path.

## Methods

### `api` (axios instance)

The configured singleton. Use `.get/.post/.put/.patch/.delete`. One response interceptor is registered at import time. Successful responses pass through unchanged. On an error it reads `status`, the request `url` and the body's `error.code`:

- **`error.code === 'ACCOUNT_SUSPENDED'`** is checked first (it can arrive on any request, and refreshing would not help): calls `forceSuspended()` and rejects.
- **Refresh and retry** when all of these hold: `status === 401`, the request has not been retried yet (`!original._retry`), the URL does not match `NO_REFRESH_URL` (`/auth/login`, `/auth/signup*`, `/auth/refresh`, `/auth/password/forgot`, `/auth/password/reset`), and the code is not `INVALID_CREDENTIALS` (a wrong password is an answer, not an expired token). Other `/auth/*` calls (sessions, `password/change`, `logout`, `logout-all`) are authenticated and do refresh.
  1. Sets `original._retry = true`, so a request is retried at most once.
  2. Single-flight: `refreshing ??= doRefresh().finally(() => (refreshing = null))`. Concurrent 401s all await the same refresh.
  3. `'renewed'`: replays the request with `api(original)`. Nothing to attach, the backend rotated the cookies via `Set-Cookie`.
  4. `'rejected'`: calls `forceLogout()`.
  5. `'unreachable'` (no response, or a 5xx): changes nothing. The original 401 is stamped `authUnreachable = true` and rejected, so callers retry instead of ending a session over a dropped connection (the installed-PWA cold start, `readme/flows/pwa.md`).
- Everything else is re-thrown with `Promise.reject(error)`, so the calling hook or `mutate()` lands in `onError`.

### `doRefresh()` (internal)

`axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })` with bare `axios`. Returns `Promise<'renewed' | 'rejected' | 'unreachable'>`: no response or a 5xx is `'unreachable'`, any other error status is `'rejected'`.

### `forceLogout()` (internal)

Runs when the refresh was rejected: the refresh token is dead and the backend's refresh handler has already cleared the cookies. It wipes the client-side mirror of the session:

1. Returns at once during SSR or when the module-level `loggedOut` flag is set.
2. **Public-route bail-out.** If `isPublicRoute(window.location.pathname)` (any `PUBLIC_PREFIXES` entry in `src/constants/routes.ts`: `/auctions`, `/leaderboard`, `/sellers`, `/pages`, `/suspended`; these render in the guest shell), it only calls `useAuthStore.getState().clear()` and returns. A 401 there means "no session", so the query cache (which holds the page's public data) is kept and there is no navigation.
3. Sets `loggedOut = true` (before clearing the cache, see the gotcha below).
4. `useAuthStore.getState().clear()`, then `queryClient.clear()` (the shared singleton from `src/lib/query-client.ts`, the same instance `<Providers>` passes to `QueryClientProvider`).
5. `syncAppBadge(0)` (`src/lib/push.ts`): the dead session took its push subscription with it, so the app-icon badge is cleared.
6. Hard navigation to `/login?next=<current path + query>` (no `next` when already on an auth route). A full-page navigation, not `router.push()`, because this runs outside React.

**Gotcha: why the `loggedOut` flag.** `queryClient.clear()` wipes the entry behind `AuthBootstrap`'s still-mounted `['me']` query, which refetches at once, before the `window.location.href` navigation takes effect. That refetch 401s, its refresh is rejected, and `forceLogout()` re-enters while still on the old page, so a pathname check cannot catch it. The flag makes the function idempotent.

Route classes live only in `src/constants/routes.ts`, imported by `proxy.ts`, `AuthBootstrap` and this file, so the edge gate, the bootstrap and `forceLogout()` cannot disagree about which pages are public.

### `forceSuspended()` (internal)

Sibling of `forceLogout()` for `ACCOUNT_SUSPENDED`. Own `suspended` flag (same idempotency reason), clears the store and the query cache, calls `syncAppBadge(0)`, then hard-navigates to `/suspended`. It has no public-route bail-out; `/suspended` is itself in `PUBLIC_PREFIXES`.

### `resetAuthFlags()`

Exported. Resets `loggedOut` and `suspended`. A successful login or signup verify navigates with `router.replace` (no page reload), so `useSignedIn()` in `use-auth.ts` calls this to make a later session death handled again.

### `isUnreachableError(err)`

Exported. `true` when an error says nothing about whether the member is signed in: no response, a 5xx, or a 401 stamped `authUnreachable`. `AuthBootstrap` uses it to retry `['me']` (up to 3 times with backoff, plus refetch on focus and reconnect) and to stay uninitialized instead of clearing the member.

### `apiErrorCode(err)` / `apiErrorDetails(err)`

Exported. Read `error.code` (`string | undefined`) and `error.details` (an object, else `undefined`) from an axios error's body; `undefined` for non-axios values. Used for code-specific UI, e.g. login's `EMAIL_NOT_VERIFIED` branch reads `details.resendAfterSec`, and `minBidFromError()` reads `details.minBidPaise` on `BID_TOO_LOW`.

### `apiErrorMessage(err, fallback?)`

Normalizes any thrown value into a user-facing string.

- **Params:** `err: unknown`; `fallback?: string`, default `'Something went wrong'`.
- **Returns:** for an axios error with no response, `"Can't reach the server. Check your connection and try again."`; for an axios error with a response, `response.data.error.message ?? err.message ?? fallback`; for any other `Error` with a message, that message; otherwise `fallback`.
- **Feature error maps** build on it: `authErrorMessage` (`auth.errors.ts`), `auctionErrorMessage`, `bidErrorMessage`, `commissionErrorMessage` and `contactErrorMessage` map known `error.code`s to friendly copy and fall back to `apiErrorMessage`.

## Response envelope conventions

Every bids-api body is `{ success, data }`; errors are `{ success: false, error: { code, message, details } }`. Feature `*.api.ts` / `*.parse.ts` files unwrap them:

- **Single object:** `res.data.data`, often one level deeper, e.g. `fetchMe` and `login` return `res.data.data.member`, `fetchAuction` decodes `data.auction`.
- **Paginated list:** `{ success, data: T[], meta: { total, page, pageSize, totalPages } }`. `parsePaged()` (`src/lib/paged.ts`) decodes it into `Paged<T> = { items, meta }` with safe defaults, and `nextPagedParam()` is the matching `getNextPageParam`. Used by bids, commissions, watchlist, notifications and admin lists.
- **Auction lists** (`GET /auctions`, `/auctions/mine`) are decoded by `parseAuctionPage()` (`auctions.parse.ts`), the only place that knows where `serverTime` sits. `meta` may carry either the offset fields or `nextCursor`; `nextAuctionPage()` (`auctions.filters.ts`) handles both. Every decoded `serverTime` is pushed into the live store (`syncServerTime`) so countdowns follow the server clock.

Filtering and search happen server-side; pass `status`, `q`, `tab`, `page`, `pageSize` as `params`. See `docs/PAGINATION.md`.

### Server-side fetches (`src/lib/server-api.ts`)

For RSC and `generateMetadata` only (`*.server.ts` files, `sitemap.ts`). `serverFetch(path, { params, revalidate, notFoundOn404 })` fetches `${serverApiOrigin()}${path}`, uses `cache: 'no-store'` unless `revalidate` is given, calls Next's `notFound()` on a 404 by default, and throws `ServerApiError(status, code, message)` on other failures. `serverGet<T>()` returns `body.data`. These requests carry no cookies, so they only reach public endpoints.

## Usage

```ts
import { api, apiErrorMessage } from '@/lib/api-client';
import { parsePaged } from '@/lib/paged';

// GET with query params, paginated envelope
const res = await api.get('/commissions/mine', { params: { status, page, pageSize: 20 } });
return parsePaged<CommissionDTO>(res.data);

// POST returning a single object
const res2 = await api.post(`/auctions/${auctionId}/bids`, { amountPaise });

// per-call timeout (the instance has none)
await api.post('/payments/verify', input, { timeout: 20_000 });

// in a component
mutation.mutate(values, { onError: (e) => toast.error(apiErrorMessage(e, 'Could not save')) });
```

## Notes

- `api` holds no token state. `auth.api.ts`'s `login()` and `signupVerify()` return the member from the body; `use-auth.ts`'s `useSignedIn()` writes it into the store and invalidates `['me']`. `logout()` / `logoutAll()` just call the endpoint.
- `getDeviceInfo()` (`src/lib/device-info.ts`, separate from this module) parses `navigator.userAgent` with `ua-parser-js` into `{ browser, os, device, type }`, sent as `deviceInfo` by `login()` and `signupVerify()`. The device id behind the per-member session cap (`deviceLimit`) is server-generated via an httpOnly `dvid` cookie, not this module.
- `AuthBootstrap` (`src/providers/auth-bootstrap.tsx`) skips `fetchMe()` only on guest-only routes (`AUTH_ROUTES`: `/login`, `/signup`, `/forgot-password`, `/reset-password`). Public pages do fetch, so the header can show the user menu; a 401 there just means logged out (and `forceLogout()`'s public-route bail-out keeps the visitor on the page).

### Reference files

- `src/lib/api-client.ts` (canonical)
- `src/constants/api.ts`, `src/constants/routes.ts`
- `src/lib/server-api.ts`, `src/lib/paged.ts`, `src/lib/assets.ts`
- `src/providers/auth-bootstrap.tsx`
- `src/features/auth/auth.api.ts`, `src/features/*/*.api.ts`, `src/features/*/*.errors.ts`
- `src/proxy.ts` (edge-side counterpart, verifies the same `nb_at` cookie)

*Last updated: 2026-11-15 (rewritten against the current code: deployment modes and `API_PROXY_TARGET`, `NO_REFRESH_URL` / `INVALID_CREDENTIALS`, `resetAuthFlags`, `apiErrorCode` / `apiErrorDetails`, `['me']` key, `server-api.ts`, real envelopes and env vars)*
