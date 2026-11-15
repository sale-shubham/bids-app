# Shill-bid risk queue (frontend)

Code: `src/features/risk/`, page `src/app/(admin)/admin/risk/page.tsx`, nav item "Risk" in `components/layout/nav-items.ts`. Backend: `bids-api` `modules/risk` (scoring job) and `modules/admin/risk`. SUPER_ADMIN only (under `/admin`).

## Model
The API scores suspicious bidder / seller pairs (reasons `SHARED_DEVICE`, `SHARED_IP`, `NEW_ACCOUNT_SINGLE_SELLER`, `CONCENTRATION`, `NEVER_WINS`) and stores a signal at or above its threshold (50). A signal blocks nothing: it is a flag for an admin. Acting on it (cancel the auction, suspend the member) uses the existing admin pages; the queue only records the outcome.

## Page `/admin/risk`
- Open / Reviewed `StatusTabs` (`?tab=`), `GET /admin/risk?status=open|reviewed&page&pageSize` through `useAdminList('risk', ...)` (table on wide layouts, cards on narrow, docs/PAGINATION.md). Open is sorted by score by the API.
- Per row: score badge (`riskScoreVariant`: 80+ destructive, 50+ warning, below secondary; `aria-label="Risk score N"`), readable reason labels (`risk.utils.ts`, unknown reasons pass through), auction link (`/auctions/<id>`), bidder and seller links (to `/admin/members?q=<email>`), flagged date.
- Open rows: **Dismiss** and **Mark action taken**, each a `ConfirmDialog` with an optional note (max 500) -> `PATCH /admin/risk/:id { outcome: 'DISMISSED' | 'ACTION_TAKEN', note? }`. Reviewed rows show the outcome, date and note. Invalidates `['admin', 'risk']`.
- Errors (`risk.errors.ts`): `RISK_SIGNAL_NOT_FOUND`, `RISK_ALREADY_REVIEWED` (both refetch the queue).
- `risk.parse.ts` is the only place signal keys are mapped (`reasons` filtered to strings, unknown `outcome` becomes null). The `shill-flag` notification renders through the generic notification item.

## Contract assumptions
Matched to `../bids-api/src/modules/admin/risk`. The score scale is open-ended (reason scores add up), so the colour bands are a UI choice, not an API contract.
