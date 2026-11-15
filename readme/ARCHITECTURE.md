# Architecture — bids-app

**Rendering:** Next.js App Router. Public pages that need SEO are server components that fetch through `src/lib/server-api.ts` / `src/features/*/*.server.ts` and export `generateMetadata`: `/auctions`, `/auctions/[id]`, `/leaderboard`, `/sellers/[id]`, `/pages/[slug]`, plus `sitemap.ts` / `robots.ts`. Interactive parts (bid panel, filters, dashboards, forms, the signed-in areas) are client components inside route-group layouts.

**App vs website:** the app contains no marketing pages. The landing page, About, How it works and Contact live in the separate `bids-website` repo (`https://noblebids.shubsale.in`); this app is `https://bidsapp.shubsale.in`, the API `https://bidsapi.shubsale.in`. The app links out to the website with absolute `<a href>` built from `NEXT_PUBLIC_WEBSITE_URL` (`src/constants/website.ts`). `/` here redirects to `/login`: `redirect('/login')`, and a signed-in user never sees it (the edge gate sends them home).

**One app shell:** every page is rendered inside `DashboardShell` (sidebar on desktop, bottom nav on phones). The public pages (`src/app/(public)/`) use `PublicShell`: logged out it is the shell's **guest mode** (nav = Auctions + Leaderboard, header "Log in" / "Sign up" with `?next=` back to the page, a Log in tab on the phone bar, footer links to the website and legal pages); signed in it shows the member's / admin's own nav. The pages stay server components (data + `generateMetadata` for SEO) and pass data into client children.

**Route areas** (tables and the `gateFor()` decision in `src/constants/routes.ts`, enforced at the edge by `src/proxy.ts` and in the client by `<AuthGuard>`):
- guest-only (exact match) — `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`; a signed-in user is redirected away (members to a safe `?next=`, else their home)
- public (no gate, guest or signed in) — `/auctions`, `/auctions/[id]`, `/leaderboard`, `/sellers/[id]`, `/pages/*`, `/suspended`
- member (BIDDER / AUCTIONEER) — `/watchlist`, `/profile`, `/notifications`
- bidder — `/my-bids`, `/purchases`, `/purchases/[id]` (BIDDER); auctioneer — `/sell/*` incl. `/sell/sales`, `/sell/sales/[id]`, `/sell/payouts` (AUCTIONEER)
- admin — `/admin/*` (SUPER_ADMIN only; members, auctions, commissions, payments, sales, reviews, settings, profile). **SUPER_ADMIN may only use `/admin/*` plus the public pages**: member routes redirect it to `/admin`; BIDDER / AUCTIONEER hitting `/admin` go to their home
- homes (`homeFor(role)`): SUPER_ADMIN `/admin`, AUCTIONEER `/sell/auctions`, BIDDER `/auctions`. `?next=` is honored only for member roles (`destinationFor`)

**Auth:** the API sets httpOnly `nb_at` (short-lived JWT) and `nb_rt` cookies; the browser never sees a token. `proxy.ts` verifies `nb_at` with `JWT_SECRET` (jose) and refreshes via `POST /auth/refresh` when it expired. Client: `AuthBootstrap` loads `GET /members/me` into the zustand `auth-store`; `api-client.ts` sends cookies (`withCredentials`), does single-flight 401 refresh and `forceLogout()`.

**API origin:** `NEXT_PUBLIC_API_URL` (`src/constants/api.ts`). Custom-domain mode: an absolute URL on the same parent domain as the app, so the auth cookie reaches both. No-domain mode: `NEXT_PUBLIC_API_URL=/api` and `next.config.ts` rewrites `/api/*` to `API_PROXY_TARGET`, so cookies stay first-party.

**State:** zustand for client state only (`auth-store`, `live-store` socket status, `recently-viewed-store` persisted to localStorage); TanStack Query (`src/lib/query-client.ts`) for all server data.

**Live bidding:** `features/live` opens one WebSocket per tab (ticket from the API, guests allowed), subscribes to the open auction, writes `bid.placed` / `auction.extended` / `auction.ended` frames into the TanStack Query cache and shows an outbid toast. Keep-alive, backoff, refetch after reconnect and a polling fallback. See `flows/websocket.md`.

**PWA:** `public/sw.js` (cache, push, badge, notification click routing), `manifest.ts`, icons and iOS splash screens generated from the NobleBid logo (`public/brand/logo-source.png`) by `scripts/generate-*`, `scripts/gen-version.mjs` writes `public/version.json` for update detection. See `flows/pwa.md`, `flows/push-notifications.md`.

**Payments:** Razorpay Checkout script loaded by `src/lib/razorpay.ts`; the API creates the order and confirms it (verify + webhook). See `flows/payments.md`.

**Deploy:** AWS Amplify (`amplify.yml`, Next.js SSR); CI lint/typecheck/test/build in `.github/workflows/dev_build.yml`. See `flows/deployment.md`.
