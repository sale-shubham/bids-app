# Admin area (frontend)

SUPER_ADMIN only. Routes live in `src/app/(admin)/admin/**`, guarded by `AuthGuard allow={['SUPER_ADMIN']}` in `(admin)/layout.tsx`. SUPER_ADMIN may only use `/admin/*` plus the public pages (member routes redirect to `/admin`; a MEMBER hitting `/admin` goes to `/auctions`). The sidebar (`useNav()`, `nav-items.ts`) lists Dashboard, Members, Auctions, Commissions, Payments, Sales, Reviews, Reports, Risk, Settings and Profile; on a phone the bottom bar shows the first three plus a Profile tab, the rest sit in the Profile page's tap grid.

| Route | Purpose |
| --- | --- |
| `/admin` | Stat cards (Members, **Buyers** = placed at least one bid, **Sellers** = listed at least one auction, linking to `/admin/members?seller=true`; the parser falls back to the old `bidders` / `auctioneers` fields for one release), revenue bar chart (INR), one **Signups** line chart (`members` per month), recent auctions |
| `/admin/members` | Search, "Selling" (All / Sellers / Non-sellers, `?seller=true|false`, validated before it is sent) + status filters, an **auctions listed** count per member (`auctionsListed`), no role badge (every member is a MEMBER), trust badges (Verified = KYC'd payout account, payout status, strikes, credit balance), **Revoke / Restore verification** (`PATCH /admin/members/:id { verified }`, ConfirmDialog; the action shows when the member is verified or their payout account is ACTIVE, with no role check, and the API re-applies the rule), activate/deactivate (there is no change-role action: `PATCH /admin/members/:id` no longer accepts `role`); strike count badge + **Strikes** dialog with Remove (ConfirmDialog + optional note), see `strikes.md`. The signed-in admin's own row actions are disabled (API also returns 409 `CANNOT_MODIFY_SELF`) |
| `/admin/auctions` | Status tabs + search; cancel (`DELETE /auctions/:id`) with a bid-count warning; the API then notifies bidders, deposit holders (deposits refunded automatically) and the seller (`auction-cancelled`); **Set deposit** on LIVE / SCHEDULED rows (`SetDepositDialog`, `PATCH /admin/auctions/:id/deposit`, rupee input or "No deposit"; Deposit column); see `deposits.md` |
| `/admin/commissions` | Status tabs in the toolbar; waive (in the row ⋯ menu, due rows only) with an optional reason, 3 to 200 chars, saved as `waivedNote` and shown under the status on WAIVED rows in the Waived and All tabs) |
| `/admin/payments` | Status tabs in the toolbar; gateway ids with inline copy buttons |
| `/admin/sales` | Status tabs + search (`q`) in one `ListToolbar`; Delivered / Refunded / Cancelled (no tab) are in the Filters panel (same `status` param); table / cards. Per-row ⋯ menu: **Release** (pay the seller now) and **Refund** (optional note, max 500) for PAID / SHIPPED / DELIVERED / DISPUTED sales, both through `<ConfirmDialog>` (page-level); see `checkout.md` |
| `/admin/reviews` | Visible / hidden / all tabs + search in one toolbar; Hide / Unhide in the row ⋯ menu through `<ConfirmDialog>` (`PATCH /admin/reviews/:id`); see `reviews.md` |
| `/admin/reports` | Open / Resolved tabs in the toolbar, outcome (Resolved) and target-type selects in the Filters panel; Dismiss and Mark action taken (note + apply to all open for the target) in the row ⋯ menu through `<ConfirmDialog>`; see `reports.md` |
| `/admin/risk` | Title-only header; Open / Reviewed tabs in the `ListToolbar`; shill-bid flags with score badge, readable reasons, auction / bidder / seller links; row ⋯ menu: View auction, Dismiss, Mark action taken (optional note) through `<ConfirmDialog>`; see `risk.md` |
| `/admin/profile` | The shared profile view (`components/common/profile-page.tsx`, same cards as `/profile`; title-only common `PageHeader` rendered by `MorePage`): Account, Security (password, devices, sign out) and App tabs |
| `/admin/settings` | Title-only `PageHeader`; the three tabs sit in a `ListToolbar` (`?tab=`, unknown value opens `marketplace`), each form keeps its own Save. Tab `marketplace` (commission %, min increment INR, anti-sniping, maximum price INR (`maxPricePaise`, ₹1,000 to ₹1,000 crore), link to `/admin/categories` (no editor here), **Checkout mode** select off / optional / required with help text, `checkoutMode`; see `payouts.md`; **Bid deposits** card: deposit threshold INR (`depositThresholdPaise`, 0 = off) and deposit rate % (`depositRateBps`, 1 to 50 %); see `deposits.md`) and tab `legal` (slug select + rich text) |

## Code map (`src/features/admin/`)
- `admin.api.ts` - axios calls. `admin.parse.ts` - the ONLY place response keys are mapped (change it if the backend renames fields). `admin.types.ts`, `admin.schema.ts` (settings form <-> API: % <-> bps, rupees <-> paise).
- `use-admin.ts` - query keys under `['admin', ...]`; every admin mutation invalidates `['admin']` (cancel also `['auctions']`, waive also `['commissions']`). `useAdminList` is the dual-pagination hook: offset `useQuery` on wide layouts, `useInfiniteQuery` on narrow ones (see docs/PAGINATION.md).
- `use-url-state.ts` - filters/page/pageSize live in the URL (`?status=&q=&page=&pageSize=`); changing a filter resets page. Pages wrap their view in `<Suspense>` because of `useSearchParams`.
- Page anatomy (PageHeader, ListToolbar, RowActionsMenu, rules): `readme/methods/admin-pages.md`. Pilots: `/admin/members` (Super admin accounts are hidden; Selling filter is All / Sellers / Non-sellers) and `/admin/auctions`. Row actions sit in a kebab menu.
- `components/` - `AdminList` (ResponsiveList + error/retry), `StatusTabs`, `CopyButton`, charts, settings forms.

## Notes
- 2FA was removed (decision D16); there is no setup banner.
- Destructive actions use `ConfirmDialog`; results are sonner toasts; errors via `apiErrorMessage` (`commissionErrorMessage` for waive).
- Saving settings refreshes the `['auctions','categories']` cache.
- Legal pages are read from the public `GET /settings/legal/:slug`, saved with `PUT /admin/settings/legal/:slug`.

## Categories (`/admin/categories`, Phase F)
Nav item "Categories". Title-only header with the New category button; tree list with inline active switch, auction counts and a row ⋯ menu (add subcategory, edit, delete), create / edit dialog with attribute schema editor, delete via `<ConfirmDialog>` (disabled when in use). Full description in `categories.md`. Settings > Marketplace no longer has a category editor (it links to this page); `categories` in admin settings is read-only and omitted from the save payload.

## Phase G part 2 (featured, credits, invoices)
- Settings > Marketplace gains a "Featured listings" card: enabled switch + 1 / 3 / 7 day prices in rupees (`featuredEnabled`, `featuredPrices` in `AdminSettings`; always sent on save).
- Settings > "Invoice details" tab: `InvoiceSettings` (`GET/PUT /admin/settings/invoice`). `/admin/invoices` lists issued invoices (search in the toolbar, Type in the Filters panel, inline Download). See `invoices.md`.
- Members: `creditBalancePaise` column and an "Adjust credits" action (`AdjustCreditsDialog`, `POST /admin/members/:id/credits`, ConfirmDialog with a signed rupee amount and a note). See `referrals.md`.
