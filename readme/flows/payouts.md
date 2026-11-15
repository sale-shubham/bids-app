# Seller payouts and checkout mode (frontend)

Code: `src/features/payouts/`, page `src/app/(auctioneer)/sell/payouts/page.tsx`, gate in `src/features/auctions/components/new-auction.tsx`, setting in `src/features/admin/components/marketplace-settings.tsx`.

## Checkout mode
Platform setting `checkoutMode`: `off` (winner and seller arrange payment themselves), `optional` (default; winners pay through the platform when the seller has an ACTIVE payout account), `required` (a seller needs an ACTIVE payout account to create auctions). Public settings (`usePublicSettings().data.checkoutMode`; missing = `optional`, `resolveCheckoutMode` in `settings.types.ts`) and admin settings GET / PUT carry it. Admin edits it in Settings > Marketplace > "Checkout" card (a select with help text per mode; the form schema `marketplaceSchema.checkoutMode`).

## `/sell/payouts` (`PayoutAccountPanel`)
- `GET /payouts/account` -> `{ account | null }` (`['payouts','account']`).
- No account: explanation + `PayoutForm`.
- Account: `PayoutStatusCard` with the status badge, an explanation, the API's `statusReason`, account holder, **only `•••• <bankLast4>`** and IFSC. Statuses: PENDING (verifying), NEEDS_CLARIFICATION (more information needed), ACTIVE, SUSPENDED (contact support), REJECTED (shows the form again to resubmit).
- `PayoutForm` posts `POST /payouts/account`: legal name, business type (individual / proprietorship), mobile, PAN, account number (+ confirm), IFSC, account holder, address (street, city, state, postal code). The account number inputs are `type="password"` (masked), `autoComplete="off"`, and the form is reset right after a successful submit; the number is never shown again and never stored client-side. The result is written to the query cache.

## Form validation (zod, `payouts.schema.ts`)
legalName 1..120; businessType individual | proprietorship; phone `/^[6-9]\d{9}$/`; PAN `/^[A-Z]{5}[0-9]{4}[A-Z]$/` and IFSC `/^[A-Z]{4}0[A-Z0-9]{6}$/` (input is upper-cased first); accountNumber `/^\d{9,18}$/` and must equal the confirmation field (client only); beneficiaryName 1..120; street1 <=100, city <=60, state <=60, postalCode 6 digits.

## Required-mode gate (`PayoutRequiredGate`)
Wraps the form on `/sell/new` (create and relist). When `checkoutMode === 'required'` and the account is not ACTIVE it renders a warning notice linking to `/sell/payouts` instead of the form. Other modes render the form without fetching the account; if the account lookup fails the form renders (the API enforces it). A create that still hits `PAYOUT_ACCOUNT_REQUIRED` shows a toast with a "Set up" action.

## Errors (`payouts.errors.ts`, `auctions.errors.ts`)
`PAYOUT_ACCOUNT_EXISTS`, `PAYOUT_ACCOUNT_REQUIRED` (403 on create auction), `PAYOUT_ACCOUNT_INACTIVE`.
