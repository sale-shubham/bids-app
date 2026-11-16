# Reports and moderation

Code: `src/features/reports/` (`reports.{api,types,constants,schema,errors}.ts`, `use-reports.ts`, `components/{report-dialog,report-button}.tsx`), `src/app/(admin)/admin/reports/page.tsx`.

## Reporting (members and guests)
- `ReportButton` (`targetType`, `targetId`, `subject`, `ownerId?`, `hidden?`) opens `ReportDialog`: a plain-language reason radio list (`REPORT_REASON_LABEL`: counterfeit, prohibited, misleading, spam, abuse, other) and optional details (max 1000). Submit = `POST /reports { targetType, targetId, reason, details? }`; success toast "Thanks - our team will review this."
- Logged-out users get a "Log in to report" dialog (`useAuthHref('/login')` keeps `?next=`).
- Entry points: auction detail (hidden for the seller), seller page (hidden for yourself), each review item (hidden when `review.isMine`), each question item (hidden when `q.isMine`).
- Errors (`reportErrorMessage`): `REPORT_TARGET_NOT_FOUND`, `INVALID_REPORT`, `ALREADY_REPORTED` (these close the dialog), `REPORT_ALREADY_RESOLVED`, `TOO_MANY_REQUESTS` / `RATE_LIMITED`.

## Admin `/admin/reports`
- Tabs Open / Resolved in the toolbar; the Filters panel holds the outcome select (Resolved only: Action taken / Dismissed, because the API filters one status at a time) and the target-type filter; state lives in the URL via `useUrlState`. The API returns newest first; HIGH priority rows are floated to the top of each page client-side.
- Each row: priority badge, target link (`target.url`), reporter, reason, details, `openCountForTarget`, and, in the row's ⋯ menu, a link to the existing moderation screen (auction -> `/admin/auctions?q=`, member -> `/admin/members?q=`, review -> `/admin/reviews`; for QUESTION targets a **Hide question** entry (ConfirmDialog, `POST /questions/:id/hide`, then refreshes `['admin','reports']`; it does not resolve the report).
- **Dismiss** (ConfirmDialog) and **Mark action taken** (both ⋯ menu entries on open rows; ConfirmDialog with optional note, max 500 chars (`REPORT_NOTE_MAX`, matches the API; textarea `maxLength` plus a `n/500` counter and the zod `resolveReportSchema`), and "Apply to all open reports for this target") call `PATCH /admin/reports/:id { status, note?, applyToAllOpenForTarget? }`; the toast shows `resolvedCount` when more than one was resolved.

## Notes
- `report-filed` notifications use the generic notification rendering.
- Legal: `prohibited-items` is in `PUBLIC_LEGAL_PAGES` (served at `/pages/prohibited-items`, footer + sitemap) and `LEGAL_PAGES` / the admin legal editor; the sell form links to it.
