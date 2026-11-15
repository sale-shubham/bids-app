# Admin area (frontend)

SUPER_ADMIN only. Routes live in `src/app/(admin)/admin/**`, guarded by `AuthGuard allow={['SUPER_ADMIN']}` in `(admin)/layout.tsx`. SUPER_ADMIN may only use `/admin/*` plus the public pages (member routes redirect to `/admin`; BIDDER / AUCTIONEER hitting `/admin` go to their home). The sidebar (`useNav()`, `nav-items.ts`) lists Dashboard, Members, Auctions, Commissions, Payments, Sales, Reviews, Reports, Risk, Settings and Profile; on a phone the bottom bar shows the first three plus a Profile tab, the rest sit in the Profile page's tap grid.

| Route | Purpose |
| --- | --- |
| `/admin` | Stat cards, revenue bar chart (INR), signups line chart, recent auctions |
| `/admin/members` | Search, role + status filters, trust badges (Verified = KYC'd payout account, payout status, strikes, credit balance), **Revoke / Restore verification** (`PATCH /admin/members/:id { verified }`, ConfirmDialog; Restore shows for an unverified AUCTIONEER whose payout is ACTIVE, the API re-applies the rule), activate/deactivate, change role (SUPER_ADMIN gets an extra warning); strike count badge + **Strikes** dialog with Remove (ConfirmDialog + optional note), see `strikes.md`. The signed-in admin's own row actions are disabled (API also returns 409 `CANNOT_MODIFY_SELF`) |
| `/admin/auctions` | Status tabs + search; cancel (`DELETE /auctions/:id`) with a bid-count warning; **Set deposit** on LIVE / SCHEDULED rows (`SetDepositDialog`, `PATCH /admin/auctions/:id/deposit`, rupee input or "No deposit"; Deposit column); see `deposits.md` |
| `/admin/commissions` | Status tabs; waive due commissions (reason field is a client-side note only) |
| `/admin/payments` | Status tabs; gateway ids with copy buttons |
| `/admin/sales` | Status tabs + search (`q`); table / cards. Per row `AdminSaleActions`: **Release** (pay the seller now) and **Refund** (optional note, max 500) for PAID / SHIPPED / DELIVERED / DISPUTED sales, both through `<ConfirmDialog>`; see `checkout.md` |
| `/admin/reviews` | Visible / hidden / all tabs + search; Hide / Unhide through `<ConfirmDialog>` (`PATCH /admin/reviews/:id`); see `reviews.md` |
| `/admin/reports` | Open / Resolved tabs + target-type filter; Dismiss and Mark action taken (note + apply to all open for the target) through `<ConfirmDialog>`; see `reports.md` |
| `/admin/risk` | Open / Reviewed tabs; shill-bid flags with score badge, readable reasons, auction / bidder / seller links; Dismiss and Mark action taken (optional note) through `<ConfirmDialog>`; see `risk.md` |
| `/admin/profile` | The shared profile view (`components/common/profile-page.tsx`, same cards as `/profile`): Account, Security (password, devices, sign out) and App tabs |
| `/admin/settings` | Tab `marketplace` (commission %, min increment INR, anti-sniping, maximum price INR (`maxPricePaise`, ₹1,000 to ₹1,000 crore), categories editor, **Checkout mode** select off / optional / required with help text, `checkoutMode`; see `payouts.md`; **Bid deposits** card: deposit threshold INR (`depositThresholdPaise`, 0 = off) and deposit rate % (`depositRateBps`, 1 to 50 %); see `deposits.md`) and tab `legal` (slug select + rich text) |

## Code map (`src/features/admin/`)
- `admin.api.ts` - axios calls. `admin.parse.ts` - the ONLY place response keys are mapped (change it if the backend renames fields). `admin.types.ts`, `admin.schema.ts` (settings form <-> API: % <-> bps, rupees <-> paise).
- `use-admin.ts` - query keys under `['admin', ...]`; every admin mutation invalidates `['admin']` (cancel also `['auctions']`, waive also `['commissions']`). `useAdminList` is the dual-pagination hook: offset `useQuery` on wide layouts, `useInfiniteQuery` on narrow ones (see docs/PAGINATION.md).
- `use-url-state.ts` - filters/page/pageSize live in the URL (`?status=&q=&page=&pageSize=`); changing a filter resets page. Pages wrap their view in `<Suspense>` because of `useSearchParams`.
- `components/` - `AdminList` (ResponsiveList + error/retry), `StatusTabs`, `PageHeader`, `CopyButton`, charts, settings forms.

## Notes
- `TwoFactorSetupBanner` (admin layout) shows while `member.twoFactorSetupRequired`; a `TWO_FACTOR_SETUP_REQUIRED` API error sets it (see `auth.md`).
- Destructive actions use `ConfirmDialog`; results are sonner toasts; errors via `apiErrorMessage` (`commissionErrorMessage` for waive).
- Saving settings refreshes the `['auctions','categories']` cache.
- Legal pages are read from the public `GET /settings/legal/:slug`, saved with `PUT /admin/settings/legal/:slug`.

## Categories (`/admin/categories`, Phase F)
Nav item "Categories". Tree list with active switch, auction counts, create / edit dialog with attribute schema editor, delete via `<ConfirmDialog>` (disabled when in use). Full description in `categories.md`. Settings > Marketplace no longer has a category editor (it links to this page); `categories` in admin settings is read-only and omitted from the save payload.

## Phase G part 2 (featured, credits, invoices)
- Settings > Marketplace gains a "Featured listings" card: enabled switch + 1 / 3 / 7 day prices in rupees (`featuredEnabled`, `featuredPrices` in `AdminSettings`; always sent on save).
- Settings > "Invoice details" tab: `InvoiceSettings` (`GET/PUT /admin/settings/invoice`). `/admin/invoices` lists issued invoices (type + search, download). See `invoices.md`.
- Members: `creditBalancePaise` column and an "Adjust credits" action (`AdjustCreditsDialog`, `POST /admin/members/:id/credits`, ConfirmDialog with a signed rupee amount and a note). See `referrals.md`.
