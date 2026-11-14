# bids-app E2E (Playwright)

Browser tests for the whole NobleBid flow against a **local** stack. This folder has its own
`package.json` and `tsconfig.json`; it is excluded from the app's tsconfig, ESLint, vitest and build.

## Prerequisites

1. Start both servers yourself (the config has no `webServer` block):
   - API: `cd ../bids-api && npm run dev` (http://localhost:4000), with
     `EMAIL_DRIVER=stub` (every email OTP is `123456`) and `PAYMENT_DRIVER=stub`
     (commission checkout returns keyId `stub`, the app shows a "Test mode - simulate payment" dialog).
     The API's auction close job runs every 60 s locally; `close-and-pay.spec.ts` relies on it.
   - App: `npm run dev` in the repo root (http://localhost:3002; `JWT_SECRET` must equal the API's).
2. The suite uses the **dev database** the API uses. `DATABASE_URL` is read by code from
   `../bids-api/.env` (override with `E2E_DATABASE_URL`); it is never printed.
3. Install once: `cd e2e && npm install && npx playwright install chromium`.

Auction images must live under the API's media base, so seeded auctions use
`<AWS_CLOUDFRONT_URL>/e2e/placeholder.jpg` (read from the same `.env`; the file need not exist, the card
falls back to a placeholder icon). Override with `E2E_IMAGE_URL`. Editing an auction through the form
re-sends that URL, so the API must have `AWS_CLOUDFRONT_URL` set for `seller.spec.ts` "edit" to pass.

## Commands (from `e2e/`)

| Command | What |
| --- | --- |
| `npm test` | whole suite (chromium + Pixel 7) |
| `npx playwright test specs/bidding.spec.ts` | one spec |
| `npm run test:ui` | Playwright UI mode |
| `npm run report` | open the last HTML report |
| `npm run typecheck` | typecheck the e2e project |

Env: `E2E_BASE_URL` (default `http://localhost:3002`), `E2E_API_URL` (default `http://localhost:4000`),
`E2E_DATABASE_URL`, `E2E_IMAGE_URL`, `E2E_UPLOAD=1` (enable the real image-upload test; needs S3 on the API).
Only `localhost` / `127.0.0.1` targets are accepted.

## Data and cleanup

- `global-setup.ts` checks both servers answer, then inserts four members straight into the DB
  (bcrypt cost 12, password `E2ePass123`, email `e2e+<run>-<role>@noblebid.test`): `admin` (SUPER_ADMIN),
  `auctioneer`, `bidderA`, `bidderB`. Each is logged in through the API and the cookies are saved to
  `.run/<role>.json` for specs (`storageStatePath`).
- Specs create auctions via `lib/db.ts` (`createAuction(startsInSec, endsInSec, ...)`) and extra members the same way,
  or through the UI (signup). All carry the run id in the email.
- `global-teardown.ts` deletes the run's members (by email prefix) plus their auctions, bids, commissions,
  notifications, watchlist rows, OTP challenges and sessions. Setup also sweeps e2e data older than 2 h
  left by crashed runs.

## Specs

`public` (home, browse filters + URL sync, detail SEO title), `auth` (signup + OTP, login, forgot/reset, unverified login),
`seller` (my auctions, edit, delete, create validation; the real-upload test is skipped unless `E2E_UPLOAD=1`),
`bidding` (two contexts: live update, outbid toast, BID_TOO_LOW), `close-and-pay` (slow: ~2-3 min waiting for the
close job, then winner result + seller pays commission in test mode), `admin`, `mobile` (Pixel 7).
Specs run serially in one worker.
