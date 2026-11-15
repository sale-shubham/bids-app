# Commission payments flow (frontend)

Code: `src/features/commissions/`, `src/features/payments/` (`use-razorpay-payment.ts`, `use-stub-payment-confirm.tsx`, `payments.api.ts`, `payments.types.ts`), `src/lib/razorpay.ts`, page `src/app/(auctioneer)/sell/commissions/page.tsx`.

## Rule
A sold auction creates a 5% commission (DUE). While `me.unpaidCommissionPaise > 0` the seller cannot create auctions (`COMMISSION_UNPAID`). `UnpaidCommissionBanner` (auctioneer layout, hidden on `/sell/commissions`) and the profile card link to `/sell/commissions`.

## Shared payment hook (`useRazorpayPayment`)
`src/features/payments/use-razorpay-payment.ts` runs the whole flow for anything payable: `useRazorpayPayment({ createCheckout(id), isAlreadyPaid?(id), invalidateKeys, confirmStub, successMessage?, errorMessage, onCheckoutError? })` returns `{ pay(id), payingId }`. `isAlreadyPaid` switches on the paid-by-webhook watcher and the post-verify fallback. `usePayCommission` (commissions) and `useSalePayment` (sales, see `checkout.md`) are thin wrappers. `useStubPaymentConfirm()` returns `{ confirmStub, stubDialog }`: render `stubDialog` once in the page. `verifyPayment` returns `{ referenceType: 'COMMISSION' | 'SALE' | 'DEPOSIT', commission?, sale? }` (a missing `referenceType` is read as COMMISSION). `CheckoutPayload` lives in `payments.types.ts` (re-exported by `commissions.types.ts`).

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

## Credits and promotions (Phase G part 2)
- `verifyPayment` also returns `referenceType: 'FEATURE'` (paid promotion, see `featured.md`).
- `usePayCommission` returns `{ pay, payingId, payWithCredits }`: `payWithCredits` is a mutation for `POST /commissions/:id/checkout { useCredits: true }` (response `{ paidWithCredits: true, commission }`). The commissions page shows "Pay with credits (balance X)" per DUE row when the balance covers it and confirms in a `ConfirmDialog`; it invalidates `['commissions']`, `['me']`, `['referral']`, `['credits']`. `INSUFFICIENT_CREDITS` is mapped in `commissions.errors.ts`. Details: `referrals.md`.
