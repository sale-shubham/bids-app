# CLAUDE.md — bids-app (NobleBid web app)

Next.js 16 App Router PWA (React 19, TypeScript, Tailwind 4, Radix/shadcn UI). State: **zustand** (auth, live socket status, recently viewed) + **TanStack Query** (server data). No Redux. Backend: `../bids-api`.

**Read first:** `.claude/RULES.md` (standing rules), `PROJECT_STRUCTURE.md`, `readme/ARCHITECTURE.md`.

## Hard rules
- **Never run a build** (`next build`, `npm run build`, `npm run preview`, `next start`) — it breaks the running dev server. Verify with `npm run check` (lint with zero warnings + `tsc --noEmit` + vitest).
- Roles: `BIDDER`, `AUCTIONEER`, `SUPER_ADMIN`. Login = email + password; email OTP only for signup verification and forgot password.
- **App only, no marketing.** The landing page / About / How it works / Contact live in the separate `bids-website` repo (links via `NEXT_PUBLIC_WEBSITE_URL`, `src/constants/website.ts`). `/` is `redirect('/login')`. SUPER_ADMIN uses only `/admin/*` plus the public pages; member routes are root-level (`/auctions`, `/my-bids`, `/sell/*`, `/watchlist`, `/notifications`, `/profile`). Public pages render in the same shell (guest mode when logged out).
- All backend calls go through `api` in `src/lib/api-client.ts`; errors via `apiErrorMessage`.
- Route classes live only in `src/constants/routes.ts` (shared by `src/proxy.ts`, `AuthBootstrap`, `api-client.ts`).
- Cookies: `nb_at` / `nb_rt` (httpOnly, set by the API). `JWT_SECRET` must equal the API's.
- Semantic Tailwind tokens only (purple `#7C3AED`, pink `#DB2777`, amber `#D97706` are tokens in `globals.css`).
- Destructive actions use `<ConfirmDialog>`; forms use zod + react-hook-form; data hooks live in `src/features/<feature>/use-<feature>.ts`.

## Commands
`npm run dev` (port 3002) · `npm run lint` · `npm run typecheck` · `npm test` (vitest) · `npm run check` (lint + typecheck + test) · E2E: `e2e/README.md`, `readme/methods/testing.md`

## Status
Feature-complete and merged into `dev`: auth (login, signup + email OTP, forgot/reset password), profile + devices, browse + server-rendered auction detail (public pages in the app shell, guest mode when logged out), selling (create/edit/delete/republish with S3 image upload), bidding with live WebSocket updates, /my-bids, notifications inbox, commission payments with Razorpay (stub mode when keyId is "stub"), watchlist, leaderboard, seller pages, admin area with charts (own `/admin/profile`), legal pages, SEO (metadata, sitemap, robots, OG image), PWA install/update prompts and Web Push. Marketing pages moved out to `bids-website` (branch `feature/split-website`); routing (SUPER_ADMIN only under `/admin`). Live hosts: website `noblebids.shubsale.in` (Amplify app `bids-website`, branch `main`), app `bidsapp.shubsale.in` (Amplify app `bids-app`, id `d1stto32j9loug`, production branch `dev`), API `bidsapi.shubsale.in` (Serverless stage `dev`); cookie domain `.shubsale.in`. The Amplify branch has `NEXT_PUBLIC_WEBSITE_URL=https://noblebids.shubsale.in` (set 2026-11-15; inlined at build time, so it applies from the next build). Remaining go-live steps are in `../bids-api/docs/GO-LIVE.md`; history and product decisions in `../bids-api/docs/DECISIONS.md`.

## Docs (README registry)

| Path | Covers |
|---|---|
| `AGENTS.md` | Agent notes |
| `PROJECT_STRUCTURE.md` | Current file layout |
| `readme/ARCHITECTURE.md` | Rendering, app vs website, route areas + role homes, auth, state, live, PWA, deploy |
| `readme/methods/*.md` | api-client (+ env vars), hooks, stores, zod-validation, testing |
| `readme/ui/*.md`, `readme/theming/*.md` | components, layout; tokens, dark mode |
| `docs/*.md` | CONFIRM_DIALOG, CONTAINER_QUERIES, CRUD_PATTERN, PAGINATION, GUIDELINES, DOC_SYNC |

Flow docs: `readme/flows/auctions.md` (app shell + website split, browse, detail, selling), `readme/flows/bidding.md` (bid panel, history, result), `readme/flows/websocket.md` (live updates), `readme/flows/payments.md` (commissions + Razorpay), `readme/flows/watchlist.md`, `readme/flows/reviews.md` (seller ratings + replies), `readme/flows/questions.md` (lot Q&A), `readme/flows/saved-searches.md` (search alerts), `readme/flows/admin.md`, `readme/flows/seo.md`, `readme/flows/pwa.md`, `readme/flows/push-notifications.md`, `readme/flows/deployment.md` (Amplify, env vars, domains).
