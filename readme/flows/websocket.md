# Live updates over WebSocket (frontend)

Code: `src/features/live/`, `src/store/live-store.ts`, `src/providers/index.tsx`. Backend contract: `bids-api` `POST /ws/ticket` (member) and `POST /ws/guest-ticket` (public) -> `{ ticket, wsUrl | null }`.

## Pieces
- `live-socket.ts` - framework-free `LiveSocket`. Fetches a fresh single-use ticket for every connect attempt, connects to `${wsUrl}?ticket=...`, parses frames through `parseLiveEvent` (junk, `pong`, `error` frames are dropped), pings every 4.5 min (API Gateway idle limit is 10 min), reconnects with exponential backoff 1 s to 30 s with jitter, reconnects on `online` and when the tab becomes visible, stops after the tab is hidden for 5 min and resumes on visible. `subscribe(auctionId)` is remembered and re-sent after every reconnect (one room per connection).
- `live-socket-provider.tsx` - `LiveSocketProvider`, one socket per tab. Members: opens app-wide with a member ticket (logout or account switch closes it, login reopens it). Guests: opens only while an auction page retains it (`retainGuest`). Handles member events (below).
- `use-auction-live.ts` - `useAuctionLive(id)` on the public auction page and the seller auction page: subscribes while mounted, applies room events to the cache.
- `live.reducers.ts` - pure event -> cache functions (`applyBidPlaced`, `applyExtended`, `applyEnded`, `prependBidToPages`), unit-test targets.
- `components/live-indicator.tsx`, `use-pulse-key.ts` - UI helpers.
- `live-store`: `status` (`idle | connecting | open | closed | unavailable`) and `connectionSeq` (bumped on every connect).

## Events
| Event | Effect |
|---|---|
| `bid.placed` (room) | `['auction', id]`: price, bidCount, endTime, highestBidderId, status LIVE, new bid first in `recentBids` (max 5, `isMe` from highestBidderId); bid prepended to page 1 of `['auction-bids', id]` if cached (deduped by id); stale events (lower bidCount) ignored; `['auctions']` invalidated, debounced 5 s |
| `auction.extended` (room) | endTime updated, toast "Time extended" |
| `auction.ended` (room) | status ENDED, then `['auction', id]` invalidated (winner and contact come from the server) |
| `bid.outbid` (member) | toast "You've been outbid on <title>" with "Bid again", invalidates `['my-bids']` |
| `auction.won` (member) | success toast with "View", invalidates `['my-bids']` |
| `notification.new` (member) | invalidates `['notifications']` and the unread count |

## Polling fallback
`useAuction` polls every 10 s only while `live-store.status !== 'open'`. When the socket (re)connects, `connectionSeq` changes and mounted `useAuction` hooks refetch once to catch missed events. `useAuctionBoundaryRefetch` stays. `wsUrl: null` sets `unavailable` and the app keeps polling (no retries).

## UI
Auction page shows a green "Live" dot when open, else grey "Updating every 10 s". The price flashes on change and new history rows fade in (`animate-price-flash`, `animate-row-in`; disabled under `prefers-reduced-motion`).

## Notes
- A hook that needs live data must call `useAuctionLive`; the member socket alone is not subscribed to any room.
- Locally `wsUrl` is `ws://localhost:4000/ws`.
