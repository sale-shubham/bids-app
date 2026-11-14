# CLAUDE.md — bids-app (NobleBid web app)

Next.js 16 App Router PWA (React 19, TypeScript, Tailwind 4, Radix/shadcn UI). State: **zustand** (auth) + **TanStack Query** (server data). No Redux. Backend: `../bids-api`.

**Read first:** `.claude/RULES.md` (standing rules), `PROJECT_STRUCTURE.md`, `readme/ARCHITECTURE.md`.

## Hard rules
- **Never run a build** (`next build`, `npm run build`, `npm run preview`, `next start`) — it breaks the running dev server. Verify with `npm run check` (lint, zero warnings + `tsc --noEmit`).
- Roles: `BIDDER`, `AUCTIONEER`, `SUPER_ADMIN`. Login = email + password; email OTP only for signup verification and forgot password.
- All backend calls go through `api` in `src/lib/api-client.ts`; errors via `apiErrorMessage`.
- Route classes live only in `src/constants/routes.ts` (shared by `src/proxy.ts`, `AuthBootstrap`, `api-client.ts`).
- Cookies: `nb_at` / `nb_rt` (httpOnly, set by the API). `JWT_SECRET` must equal the API's.
- Semantic Tailwind tokens only (purple `#7C3AED`, pink `#DB2777`, amber `#D97706` are tokens in `globals.css`).
- Destructive actions use `<ConfirmDialog>`; forms use zod + react-hook-form; data hooks live in `src/features/<feature>/use-<feature>.ts`.

## Commands
`npm run dev` (port 3002) · `npm run lint` · `npm run typecheck` · `npm run check`

## Status
Phase 1: auth (login, signup + email OTP, forgot/reset password), profile, header user menu and route guards are real; /auctions, /watchlist, /my-bids, /sell/auctions, /admin are placeholders. Phase 7/8: PWA icons and splash generated from the logo (scripts/generate-*), push opt-in after first bid/watch, Amplify deploy readiness; see readme/flows/pwa.md, push-notifications.md, deployment.md.
Phase 5: /sell/commissions lists commissions and pays them with Razorpay (stub mode when keyId is "stub"); see readme/flows/payments.md.
Phase 6A: watchlist (hearts, /watchlist, nav badge), /leaderboard, /sellers/[id], /about, /how-it-works, /contact, server-rendered legal pages, sitemap/robots/OG image; see readme/flows/watchlist.md and seo.md.
