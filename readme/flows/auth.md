# Auth: login, verified badge

Code: `src/features/auth/` (api, schema, errors, `use-auth.ts`, `components/{verify-email-step,forgot-password-flow}`), `src/app/(auth)/login/page.tsx`, `src/features/members/` (profile calls).

There is no SMS phone verification, WhatsApp opt-in or two-factor authentication: the owner has no MSG91, WhatsApp or TOTP key, and the API removed all three. Login is email + password only.

## Login
1. `POST /auth/login` (`authApi.login`) returns `{ member }` and sets the cookies; `authApi.login` resolves with the member.
2. `useLogin()` signs in (store update, `['me']` refetch, role redirect). `EMAIL_NOT_VERIFIED` (403) switches the page to `VerifyEmailStep` (the API just emailed a fresh code); `ACCOUNT_SUSPENDED` is handled by the api-client interceptor. `NO_REFRESH_URL` (api-client) covers `/auth/(login|signup|refresh|password/(forgot|reset))`.

## Security tab (`/profile`, `/admin/profile`; `ProfilePage`)
`ChangePasswordCard`, `MyDevicesCard`, `SignOutCard`. The profile phone (Account tab) is plain contact info: it is not verified and nothing depends on it.

## Verified badge
`member.verified` (and `verified` on auction/seller DTOs) means the seller has a KYC'd payout account: AUCTIONEER + payout account `ACTIVE` + not revoked by an admin (see `payouts.md`). `VerifiedBadge` tooltip: "Verified seller: payout account KYC completed". Admins can revoke / restore it on `/admin/members`.

## Error codes (`auth.errors.ts`)
`INVALID_CREDENTIALS`, `INVALID_CURRENT_PASSWORD`, `EMAIL_TAKEN`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`, `RATE_LIMITED`, `TOO_MANY_REQUESTS`; anything else falls back to the server message.

## Referral code on signup
`/signup?ref=CODE` is remembered for 30 days (`localStorage` key `nb_ref`, `features/referrals/referral-code.ts`) and sent as `referralCode` in `POST /auth/signup`; cleared after a successful signup. The API ignores an invalid or unknown code silently (no error). See `referrals.md`.
