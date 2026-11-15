# Admin area (frontend)

SUPER_ADMIN only. Routes live in `src/app/(admin)/admin/**`, guarded by `AuthGuard allow={['SUPER_ADMIN']}` in `(admin)/layout.tsx`. SUPER_ADMIN may only use `/admin/*` plus the public pages (member routes redirect to `/admin`; BIDDER / AUCTIONEER hitting `/admin` go to their home). The sidebar (`useNav()`, `nav-items.ts`) lists Dashboard, Members, Auctions, Commissions, Payments, Settings and Profile; on a phone the bottom bar shows the first three plus a Profile tab, the rest sit in the Profile page's tap grid.

| Route | Purpose |
| --- | --- |
| `/admin` | Stat cards, revenue bar chart (INR), signups line chart, recent auctions |
| `/admin/members` | Search, role + status filters, activate/deactivate, change role (SUPER_ADMIN gets an extra warning). The signed-in admin's own row actions are disabled (API also returns 409 `CANNOT_MODIFY_SELF`) |
| `/admin/auctions` | Status tabs + search; cancel (`DELETE /auctions/:id`) with a bid-count warning |
| `/admin/commissions` | Status tabs; waive due commissions (reason field is a client-side note only) |
| `/admin/payments` | Status tabs; gateway ids with copy buttons |
| `/admin/profile` | The shared profile view (`components/common/profile-page.tsx`, same cards as `/profile`): Account, Security (password, devices, sign out) and App tabs |
| `/admin/settings` | Tab `marketplace` (commission %, min increment INR, anti-sniping, maximum price INR (`maxPricePaise`, ₹1,000 to ₹1,000 crore), categories editor) and tab `legal` (slug select + rich text) |

## Code map (`src/features/admin/`)
- `admin.api.ts` - axios calls. `admin.parse.ts` - the ONLY place response keys are mapped (change it if the backend renames fields). `admin.types.ts`, `admin.schema.ts` (settings form <-> API: % <-> bps, rupees <-> paise).
- `use-admin.ts` - query keys under `['admin', ...]`; every admin mutation invalidates `['admin']` (cancel also `['auctions']`, waive also `['commissions']`). `useAdminList` is the dual-pagination hook: offset `useQuery` on wide layouts, `useInfiniteQuery` on narrow ones (see docs/PAGINATION.md).
- `use-url-state.ts` - filters/page/pageSize live in the URL (`?status=&q=&page=&pageSize=`); changing a filter resets page. Pages wrap their view in `<Suspense>` because of `useSearchParams`.
- `components/` - `AdminList` (ResponsiveList + error/retry), `StatusTabs`, `PageHeader`, `CopyButton`, charts, settings forms.

## Notes
- Destructive actions use `ConfirmDialog`; results are sonner toasts; errors via `apiErrorMessage` (`commissionErrorMessage` for waive).
- Saving settings refreshes the `['auctions','categories']` cache.
- Legal pages are read from the public `GET /settings/legal/:slug`, saved with `PUT /admin/settings/legal/:slug`.
