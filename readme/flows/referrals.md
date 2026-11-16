# Referrals and credits

Code: `src/features/referrals/` (`referral-code.ts`, `referrals.api/types.ts`, `use-referrals.ts`, `components/{refer-card,credit-ledger}.tsx`), signup page `src/app/(auth)/signup/page.tsx`, profile tab in `src/components/common/profile-page.tsx`, commission credits in `src/app/(member)/sell/commissions/page.tsx`, admin credits in `src/features/admin/components/adjust-credits-dialog.tsx`.

## Capturing a code
The invite link is `/signup?ref=CODE`. The signup page reads `window.location.search` in an effect and `captureReferralCode` stores `{ code, expires }` in `localStorage` (`nb_ref`, 30 days, every access in try/catch; codes must match `^[A-Za-z0-9_-]{3,40}$`). On submit `readReferralCode()` is sent as `referralCode` in `POST /auth/signup` (omitted when none); a successful signup clears it.

## Refer & earn tab (`/profile?tab=refer`, members only)
`ReferCard` (`GET /members/me/referral`, key `['referral']`): code + Copy code, `ShareButtons` (copy link / WhatsApp / native share, reused from the auctions feature with the API `link`), reward copy ("Earn X in credits when a friend you invite completes their first purchase or sale. Credits pay for promotions and commission."), counts (pending / qualified / rewarded / rejected), credit balance, a "paused" note when `enabled` is false. `CreditLedger` (`GET /members/me/credits`, key `['credits']`, infinite scroll, 20 per page): reason label, note, date, signed amount.

## Spending credits
`useCreditBalance()` (from `['referral']`) drives the "Pay with credits (balance X)" checkbox, shown only when the balance covers the amount.
- Commissions: per DUE row; paying opens a `ConfirmDialog` then `POST /commissions/:id/checkout { useCredits: true }` (`usePayCommission().payWithCredits`). `INSUFFICIENT_CREDITS` maps in `commissions.errors.ts`.
- Promotions: see `featured.md`.

## Admin
`POST /admin/members/:id/credits { amountPaise (non-zero, +/-), note }` via "Adjust credits" on `/admin/members` (rupees, signed; confirm dialog with form). The members table shows the credit balance.
