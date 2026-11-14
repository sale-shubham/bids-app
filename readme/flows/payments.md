# Commission payments flow (frontend)

Code: `src/features/commissions/`, `src/features/payments/payments.api.ts`, `src/lib/razorpay.ts`, page `src/app/(auctioneer)/sell/commissions/page.tsx`.

## Rule
A sold auction creates a 5% commission (DUE). While `me.unpaidCommissionPaise > 0` the seller cannot create auctions (`COMMISSION_UNPAID`). `UnpaidCommissionBanner` (auctioneer layout, hidden on `/sell/commissions`) and the profile card link to `/sell/commissions`.

## Pay flow (`usePayCommission`)
1. `POST /commissions/:id/checkout` returns `{ orderId, amountPaise, currency, keyId, description, prefill }`.
2. `keyId !== 'stub'`: `openRazorpayCheckout` loads checkout.js and opens order mode (brand `#7C3AED`). It resolves with `razorpay_*` ids, or rejects with `RazorpayCheckoutError` (`dismissed`, `failed`, `load`).
3. `keyId === 'stub'` (test mode): checkout.js is never loaded; the page shows "Test mode — simulate a successful payment?" and, on confirm, verifies with `paymentId: 'stub_pay_' + Date.now()`, `signature: 'stub'`.
4. `POST /payments/verify { orderId, paymentId, signature }`, then invalidate `['commissions']` (list + summary) and `['me']`.
5. A ref guard plus `payingId` disable every Pay button while one payment runs.

## Errors
- Dismissed modal: neutral toast "Payment cancelled". `payment.failed`: toast with Razorpay's description.
- Verify fails after a real payment: toast "Payment received — confirming…" and refetch commissions + `['me']` after 5 s and 15 s (the webhook marks it paid server-side).
- Codes in `commissions.errors.ts`: `COMMISSION_NOT_FOUND`, `COMMISSION_NOT_DUE` (also refetches), `ORDER_NOT_FOUND`, `INVALID_SIGNATURE`, `PAYMENT_NOT_CAPTURED`, `AMOUNT_MISMATCH`.

## Queries
`['commissions', tab]` infinite (tabs due/paid/waived/all, page size 20), `['commissions','summary']`, `['me']`.
