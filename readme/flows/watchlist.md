# Watchlist

- Backend: `GET /watchlist` (paginated `{ addedAt, auction }`), `GET /watchlist/ids` -> `{ ids, activeCount }`, `POST|DELETE /watchlist/:auctionId`. Auction detail carries `isWatching` and `watcherCount`.
- `features/watchlist/use-watchlist.ts`:
  - `['watchlist-ids']` is fetched once for signed-in members (`enabled` on the auth store member, 5 min stale). Every heart reads it via `useIsWatching(id)`, so cards never fetch per item.
  - `useToggleWatch` is optimistic: it patches the ids cache in `onMutate`, rolls back and toasts on error, and invalidates `['watchlist-ids']`, `['watchlist']` and `['auction', id]` on settle.
  - `['watchlist', 'list' | 'infinite', ...]` (via `usePagedList(watchlistKey, ...)`) feeds `/watchlist`: `PagedList` with a table on wide (status, current price, ends, actions View / Remove from watchlist) and cards on narrow; `?page=` / `?pageSize=` in the URL. Invalidating `['watchlist']` refreshes both.
- `WatchButton` (overlay variant on `AuctionCard`, inline "Watch" on the detail page). Guests are sent to `/login?next=<current path>` (read from `window.location` at click time so static pages are not forced dynamic). It sits beside, not inside, the card link (no nested anchors).
- Nav: `useNav()` attaches `badge = activeCount` to the `/watchlist` item (live/upcoming watched auctions only).
- Detail page shows "N people are watching" when `watcherCount > 0`.
- Members get an `ending-soon` email/push 1 hour before a watched auction ends (backend job); copy on the empty state mentions it, and the empty state has a "Browse auctions" button (`/auctions`).
