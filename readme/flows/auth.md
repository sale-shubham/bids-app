# Auth: login, two-factor, phone verification

Code: `src/features/auth/` (api, schema, errors, `use-auth.ts`, `components/{login-two-factor-step,recovery-codes,verify-email-step}`), `src/app/(auth)/login/page.tsx`, `src/components/common/{two-factor-card,phone-verification-card,two-factor-setup-banner}.tsx`, `src/features/members/` (phone calls).

## Login (two steps when 2FA is on)
1. `POST /auth/login` (`authApi.login`) returns a `LoginResult`: `{ member }` (cookies set) or `{ twoFactorRequired: true, challengeToken }` (NO cookies).
2. `useLogin()` signs in only for `{ member }` (store update, `['me']` refetch, role redirect). For a challenge the page shows `LoginTwoFactorStep`: a 6-digit `OtpInput`, or a recovery code field behind the "Use a recovery code" toggle. It calls `POST /auth/2fa/verify` with `{ challengeToken, code }` or `{ challengeToken, recoveryCode }` plus `deviceInfo`; `useTwoFactorVerify()` then continues exactly like a normal login.
3. `TWO_FACTOR_CHALLENGE_INVALID` (401) returns to the password step with a toast; `TWO_FACTOR_INVALID_CODE` (400) stays on the step with an inline error. `/auth/2fa/verify` is in `NO_REFRESH_URL` (api-client) so its 401 is never treated as an expired session.

## Security tab (`/profile`, `/admin/profile`; `ProfilePage`)
- **Phone number card** (`PhoneVerificationCard`): shows a Verified badge from `member.phoneVerifiedAt`; otherwise Verify -> `POST /members/me/phone/otp { phone }` -> `{ sentTo }` -> 6-digit input -> `POST /members/me/phone/verify { phone, code }` -> member. The number is the profile phone reduced to a 10-digit Indian mobile (`toIndianMobile`); without one the card points to the Account tab. Rate-limit errors show the API's own message and start the resend cooldown (`useResendCooldown`). Changing the phone in the profile clears verification server-side.
- **Two-factor card** (`TwoFactorCard`): off -> Set up (`POST /auth/2fa/setup`) shows a QR (`qrcode` -> data URL from `otpauthUrl`), the secret in a copyable monospace block and a 6-digit input -> `POST /auth/2fa/enable { code }` -> recovery codes shown once (Copy, Download .txt, "I saved these"). On -> Regenerate recovery codes (`POST /auth/2fa/recovery-codes { code }`, ConfirmDialog) and Turn off (`POST /auth/2fa/disable { password, code }`, destructive ConfirmDialog, the code may be a recovery code). Enable/disable invalidate `['me']`.

## Admin 2FA requirement
`GET /members/me` returns `twoFactorSetupRequired` for a SUPER_ADMIN when the server requires admin 2FA. `TwoFactorSetupBanner` (mounted in the admin layout) shows a persistent banner linking to `/admin/profile?tab=security`. When any admin call returns `TWO_FACTOR_SETUP_REQUIRED` (403), the api-client response interceptor sets `member.twoFactorSetupRequired = true` in the store (banner appears) and `apiErrorMessage` returns a friendly line instead of a generic error.

## Error codes (`auth.errors.ts`)
`TWO_FACTOR_INVALID_CODE`, `TWO_FACTOR_CHALLENGE_INVALID`, `TWO_FACTOR_ALREADY_ENABLED`, `TWO_FACTOR_NOT_ENABLED`, `TWO_FACTOR_UNAVAILABLE`, `TWO_FACTOR_SETUP_REQUIRED`, plus the older credential / rate-limit codes. Disabling with a wrong password returns `INVALID_CURRENT_PASSWORD` (shown on the password field).

## Packages
`qrcode` (+ `@types/qrcode`) renders the 2FA QR code client-side; the secret never leaves the browser.
