# Notification preferences + WhatsApp opt-in

Profile > Notifications (`?tab=notifications`), every signed-in role.

## API
- `GET /members/me/notification-preferences` -> `{ items: [{ type, label, group, email, push, whatsapp, emailLocked, whatsappCapable }], whatsappOptIn, phoneVerified }`.
- `PUT` same path, body `{ items: [{ type, email, push, whatsapp }] }` (all rows, one call) -> the same shape.
- `POST /members/me/whatsapp` `{ optIn }` (the API answers `{ whatsappOptIn }`; an updated member is also read). Error `PHONE_NOT_VERIFIED` (409). The member DTO carries `whatsappOptIn`.

## Code (`src/features/notification-preferences/`)
- `notification-preferences.api.ts`, `.errors.ts` (`preferenceErrorMessage`), `use-notification-preferences.ts` (key `['notification-preferences']`; `useWhatsappOptIn` mirrors the flag into the auth store and the cache).
- `WhatsappCard`: unverified phone -> link to `/profile?tab=security`; verified -> opt-in switch with the consent text ("... at +91 •••••• 3210. You can turn this off anytime.").
- `NotificationPreferencesCard`: rows grouped by `group`; Email / Push / WhatsApp switches. Email is locked (disabled, lock icon + tooltip) when `emailLocked`; WhatsApp shows only for `whatsappCapable` rows and is disabled until opted in. The card keeps only the member's edits over the server data, so Save is enabled only while something differs from the saved state (toggling back clears it). One PUT, then a success toast.

## Member flag
`GET /members/me` carries `whatsappOptIn`; login and signup-verify carry only `whatsappOptInAt`, so read it through `isWhatsappOptedIn(member)` (`auth-store.ts`). `POST /members/me/whatsapp` returns `{ whatsappOptIn }`; `useWhatsappOptIn` writes it into the store and the preferences cache. The PUT silently forces email=true for mandatory types and whatsapp=false for non-capable ones (capable: outbid, ending-soon, auction-won); the response replaces the cache. Analytics `days` defaults to 30 server-side; a non-owner gets 404 on the per-auction endpoint.
