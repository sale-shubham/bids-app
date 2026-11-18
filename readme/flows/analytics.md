# Analytics (views + seller analytics)

## API
- `POST /auctions/:id/view` (guests allowed, 204). Sent through the `api` client (cookies identify the viewer; axios has no `keepalive`/beacon).
- `GET /analytics/seller?days=7|30|90` -> `{ range, totals { views, uniqueViewers, watchers, bids, bidders, sold, revenuePaise }, daily [{ date, views, bids }], auctions [...] }`.
- `GET /analytics/auctions/:id?days=` -> `{ auction, totals { views, uniqueViewers, watchers, bids, bidders }, daily [{ date, views, uniqueViewers, bids }] }`.

## Code (`src/features/analytics/`)
- `useTrackAuctionView(auctionId, sellerId)` (called by `AuctionDetailView`): fire-and-forget, once per auction per page load (module-level set), waits for the session to settle, skips the seller, ignores errors.
- `use-analytics.ts`: keys `['analytics','seller',days]` and `['analytics','auction',id,days]`.
- `/sell/analytics` (`SellerAnalyticsPage`, any MEMBER via the `/sell` prefix, nav item "Analytics"): 7/30/90 `DaysSwitch` (kept in the URL as `?days=`, validated against `ANALYTICS_DAYS`, default 30; errors render as `Notice` + Try again), KPI `StatCard`s, `DailyChart` (recharts, styles shared with `admin-charts`), sortable auctions table (`useSortState` / `SortableTableHead`; title links to `/sell/auctions/[id]`). Empty state when nothing happened.
- `AuctionAnalyticsSection` on `/sell/auctions/[id]`: totals tiles + daily chart, empty state.
