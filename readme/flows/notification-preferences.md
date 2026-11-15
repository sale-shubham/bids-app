# Notification preferences

Profile > Notifications (`?tab=notifications`), every signed-in role. Channels are Email and Push only (no WhatsApp).

## API
- `GET /members/me/notification-preferences` -> `{ items: [{ type, label, group, email, push, emailLocked }] }`.
- `PUT` same path, body `{ items: [{ type, email, push }] }` (all rows, one call) -> the same shape. The PUT silently forces email=true for mandatory types; the response replaces the cache.

## Code (`src/features/notification-preferences/`)
- `notification-preferences.api.ts`, `.errors.ts` (`preferenceErrorMessage`, falls through to `apiErrorMessage`), `use-notification-preferences.ts` (key `['notification-preferences']`).
- `NotificationPreferencesCard`: rows grouped by `group`; Email / Push switches. Email is locked (disabled, lock icon + tooltip) when `emailLocked`. The card keeps only the member's edits over the server data, so Save is enabled only while something differs from the saved state (toggling back clears it). One PUT, then a success toast.
