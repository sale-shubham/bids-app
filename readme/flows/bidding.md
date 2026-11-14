# Bidding flow (frontend)

Code: `src/features/bids/`, `src/features/notifications/`, `src/features/auctions/use-auctions.ts`.

## Placing a bid
1. Auction detail (`/auctions/[id]`) renders `BidPanel`. The viewer state decides the action area: guest (Log in to bid, `?next=`), non-bidder, own auction, not started (start countdown), highest bidder (disabled, badge), ended (`AuctionResult`), otherwise `BidControls`.
2. Min next bid = `bidCount === 0 ? startingBidPaise : currentBidPaise + minIncrementPaise` (`bids.utils.ts`). Quick buttons are `base + k * increment` (k = 1, 2, 5); the custom input takes whole rupees (converted to paise, must be at least the min).
3. A confirm dialog shows the amount, then `POST /auctions/:id/bids { amountPaise }`.
4. On success `usePlaceBid` writes `data.auction` into `['auction', id]`, syncs the server clock from `serverTime`, and invalidates `['auction-bids', id]`, `['my-bids']`, `['auctions']`.
5. Errors map to copy in `bids.errors.ts`. `BID_TOO_LOW` shows `details.minBidPaise`; `BID_TOO_LOW`, `AUCTION_ENDED`, `ALREADY_HIGHEST`, `AUCTION_NOT_STARTED` also refetch the auction.

## Freshness
- Live events over WebSocket update the cache (`readme/flows/websocket.md`). `useAuction` polls every 10 s (tab visible, status LIVE or SCHEDULED) only while the socket is not open.
- `useAuctionBoundaryRefetch` refetches once at start (SCHEDULED), once at end time, and once 70 s after end (server close job lag).
- The server-rendered detail is anonymous, so `useAuction` marks `initialData` stale and refetches on mount to get `isMe`, `myHighestBidPaise`, `contact`.

## History, results
- `BidHistory` starts from `recentBids` (latest 5); "Show all bids" loads `GET /auctions/:id/bids` (infinite query). Seller page loads it in full. Times use the server clock (`useServerNow`).
- `AuctionResult`: Sold for / Ended with no bids; winner sees "You won!" plus seller contact; seller sees winner contact plus commission note (`/sell/commissions`). `contact` only arrives for those two viewers.

## Pages
- `/my-bids` (bidder): `GET /bids/mine?tab=`; outbid cards link "Bid again".
- `/sell/auctions/[id]` (auctioneer): summary, result, full history, edit/delete when no bids.
- `/notifications` (member) and the header `NotificationBell`: `GET /notifications`, mark one/all read. Unread count (`GET /notifications/unread-count` -> `{ count }`) is polled every 60 s while visible and also feeds the app-icon badge (`features/push`).
