# Bid deposits (frontend)

Code: `src/features/deposits/`, `src/features/bids/components/bid-panel.tsx`, admin `src/app/(admin)/admin/auctions/page.tsx` and the marketplace settings form. Backend: `bids-api` `modules/deposits`. Payment mechanics are the shared `useRazorpayPayment` (see `payments.md`).

## Model
High-value auctions can require a refundable deposit before a bidder may bid. The amount is `depositPaise` on the auction (default from the settings: `depositThresholdPaise`, `0` = off, and `depositRateBps` of the starting bid; an admin can override or clear it per auction). Auction detail carries the viewer's state: `deposit: { requiredPaise, status: 'PENDING' | 'HELD' | 'REFUNDED' | 'FORFEITED' | null }` (`requiredPaise` 0 = nothing to pay; members with 2 active strikes get a deposit on every bid, see `strikes.md`). The server refunds it automatically when the viewer does not win and forfeits it only when they win and do not pay.

## Bid panel (`BidPanel`)
- `needsDeposit(auction)` = `deposit.requiredPaise > 0 && status !== 'HELD'`. In that case (signed-in MEMBER who is not the seller, live) the bid controls are replaced by `DepositCard`: "Refundable deposit required", the amount, "Refunded automatically if you don't win. Forfeited only if you win and don't pay.", and **Pay ₹X deposit**.
- **Pay** = `useDepositPayment(confirmStub)` = `useRazorpayPayment` with `createCheckout` -> `POST /auctions/:id/deposit/checkout` (same payload as the sale / commission checkout; `keyId === 'stub'` shows the "Test mode" `ConfirmDialog` from `useStubPaymentConfirm`), then `POST /payments/verify` (returns `referenceType: 'DEPOSIT'`). The watcher (`isAlreadyPaid`) refetches the auction and checks `deposit.status === 'HELD'`. On success it invalidates `['auction']`, `['auctions']`, `['notifications']`, `['me']`, so the card turns into the bid controls.
- When `status === 'HELD'` a small "Deposit paid" chip (`DepositPaidChip`) shows above the controls.

## Errors (`deposits.errors.ts`)
- `DEPOSIT_REQUIRED` (403, `details.depositPaise`) on a bid or Buy It Now: toast "Pay the ₹X refundable deposit to bid on this auction." and the auction is refetched, so the card appears.
- `DEPOSIT_ALREADY_HELD` / `DEPOSIT_NOT_REQUIRED` (409): mapped copy and an auction refetch (`isStaleDepositError`), also when raised while creating the checkout.
- Payment errors fall back to the shared Razorpay codes (`commissionErrorMessage`).

## Admin
- `/admin/auctions`: **Set deposit** on LIVE / SCHEDULED rows (table has a Deposit column, cards show it). `SetDepositDialog` (a `ConfirmDialog` with a rupee input and a "No deposit" checkbox) -> `PATCH /admin/auctions/:id/deposit { depositPaise: number | null }`. `parseDepositRupees` accepts up to 2 decimals and rejects 0 (use "No deposit"). Invalidates `['admin']` and `['auction']`.
- `/admin/settings` marketplace tab, "Bid deposits" card: **Deposit threshold (₹, 0 = off)** (`depositThresholdPaise`) and **Deposit rate (%)** (`depositRateBps`, 1 to 50 %, form value is a percent, API value is bps) in `marketplaceSchema` / `settingsToForm` / `formToSettings`. `PublicSettings` has both as optional (older API).

## Contract assumptions
Confirmed against `../bids-api/src` (branch `feature/trust-2`): checkout route, error codes, settings keys, `PATCH /admin/auctions/:id/deposit`. Not confirmed: the checkout `description` (the client renames the commission default to "NobleBid bid deposit"), whether a FORFEITED / REFUNDED viewer gets a fresh `requiredPaise` on the same auction (the card is shown whenever `requiredPaise > 0` and not HELD, and the server stays the authority via `DEPOSIT_REQUIRED`).
