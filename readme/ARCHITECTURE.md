# Architecture — bids-app

**Rendering:** Next.js App Router, mostly client components inside route-group layouts.

**Route areas** (tables in `src/constants/routes.ts`, enforced at the edge by `src/proxy.ts` and in the client by `<AuthGuard>`):
- public — `/`, `/auctions`, `/leaderboard`, `/sellers`, `/how-it-works`, `/about`, `/contact`, `/pages/*`, `/suspended`
- guest-only — `/login`, `/signup`, `/forgot-password`, `/reset-password`
- member (any role) — `/watchlist`, `/profile`
- bidder — `/my-bids`; auctioneer — `/sell/*`; admin — `/admin/*` (SUPER_ADMIN may enter every area)

**Auth:** the API sets httpOnly `nb_at` (short-lived JWT) and `nb_rt` cookies. `proxy.ts` verifies `nb_at` with `JWT_SECRET` (jose) and refreshes via `POST /auth/refresh` when it expired. Client: `AuthBootstrap` loads `GET /members/me` into the zustand `auth-store`; `api-client.ts` does single-flight 401 refresh and `forceLogout()`.

**State:** zustand for session identity only; TanStack Query (`src/lib/query-client.ts`) for all server data.

**PWA:** `public/sw.js` (cache, push, badge), `manifest.ts`, `scripts/gen-version.mjs` writes `public/version.json` for update detection. Icons/splash: TODO generate from the NobleBid logo.

**Deploy:** AWS Amplify (`amplify.yml`); CI lint/typecheck/build in `.github/workflows/dev_build.yml`.
