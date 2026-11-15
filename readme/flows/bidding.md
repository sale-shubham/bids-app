# Bidding flow (frontend)

Code: `src/features/bids/`, `src/features/notifications/`, `src/features/auctions/use-auctions.ts`.

## Placing a bid (max / proxy bidding)
Every bid is a MAX bid (eBay-style): the system bids for the viewer only as much as needed to keep them in the lead.
1. Auction detail (`/auctions/[id]`) renders `BidPanel`. The viewer state decides the action area: guest (Log in to bid, `?next=`), non-bidder, own auction, not started (start countdown), leading (banner "You're the highest bidder · your max ₹X" plus a "Raise your max" control), ended (`AuctionResult`), otherwise `BidControls`.
2. Min next bid = `bidCount === 0 ? startingBidPaise : currentBidPaise + minIncrementPaise` (`bids.utils.ts`). Quick buttons are `base + k * increment` (k = 1, 2, 5) and set the maximum; the input ("Your maximum bid (₹)", helper "We bid for you, only as much as needed to keep you in the lead.") takes whole rupees (converted to paise, at least the min and at most the platform maximum price from `useMaxPricePaise()`). "Raise your max" (`BidControls` with `raiseFrom = myMaxBidPaise`) requires an amount above the current max and uses the same submit hook.
3. A confirm dialog states the amount is a maximum, then `POST /auctions/:id/bids { maxAmountPaise }` -> `{ auction, bid | null, serverTime, outbidByProxy }`.
4. No optimistic UI: the server response is the truth. On success `usePlaceBid` writes `data.auction` into `['auction', id]`, syncs the server clock, and invalidates `['auction-bids', id]`, `['my-bids']`, `['auctions']`. When `outbidByProxy` is true (another bidder's max is higher) it toasts "Another bidder's maximum is higher. Try a higher maximum." instead of the success toast, and `BidControls` keeps the form open with the typed value.
5. Errors map to copy in `bids.errors.ts`. `BID_TOO_LOW` shows `details.minBidPaise`; `MAX_TOO_LOW` (leader lowered/kept their max) shows `details.currentMaxPaise`; `BUY_NOW_UNAVAILABLE`, `PRICE_TOO_HIGH` mapped. `BID_TOO_LOW`, `MAX_TOO_LOW`, `AUCTION_ENDED`, `ALREADY_HIGHEST` (no longer sent, handled harmlessly), `AUCTION_NOT_STARTED` also refetch the auction.

## Deposits
When the viewer's `auction.deposit.requiredPaise > 0` and the status is not HELD, `BidPanel` replaces the bid controls with `DepositCard` ("Refundable deposit required", **Pay ₹X deposit**); when HELD it shows a "Deposit paid" chip. Bids and Buy It Now can fail with `DEPOSIT_REQUIRED` (403, `details.depositPaise`), `DEPOSIT_ALREADY_HELD`, `DEPOSIT_NOT_REQUIRED`: each toasts mapped copy and refetches the auction. Full flow in `deposits.md`. `/my-bids` shows the strike banner (`strikes.md`).

## Reserve and Buy It Now
- Reserve: `hasReserve` shows a "Reserve not met" (warning) / "Reserve met" (success) badge beside the price in `BidPanel`. The amount is hidden from bidders; only the seller/admin get `reservePricePaise`. The live `bid.placed` event carries `reserveMet`.
- Buy It Now: when `buyNowPricePaise` is set (null once any bid exists), the auction is live and the viewer is a bidder who is not the seller, `BidControls` shows "Buy now for ₹X". It opens a `<ConfirmDialog>` ("You agree to buy this item for ₹X. The auction ends immediately."), then `useBuyNow(auctionId)` -> `POST /auctions/:id/buy-now` (no body) -> `{ auction, serverTime }`; the response is written to `['auction', id]` and the same keys as `usePlaceBid` are invalidated. `BUY_NOW_UNAVAILABLE` / `AUCTION_ENDED` toast and refetch the auction. The auction card shows a "Buy now ₹X" chip.

## Freshness
- Live events over WebSocket update the cache (`readme/flows/websocket.md`). `useAuction` polls every 10 s (tab visible, status LIVE or SCHEDULED) only while the socket is not open.
- `useAuctionBoundaryRefetch` refetches once at start (SCHEDULED), once at end time, and once 70 s after end (server close job lag).
- The server-rendered detail is anonymous, so `useAuction` marks `initialData` stale and refetches on mount to get `isMe`, `myHighestBidPaise`, `myMaxBidPaise`, `contact`.

## History, results
- `BidHistory` marks proxy bids with a small "auto" tag (`kind: 'AUTO'`) and buy-now purchases with a "Buy now" tag (`kind: 'BUY_NOW'`). It starts from `recentBids` (latest 5); "Show all bids" loads `GET /auctions/:id/bids` (infinite query). Seller page loads it in full. Times use the server clock (`useServerNow`).
- `AuctionResult`: `sold` means `winnerId` is set (a bid is not a sale). Sold for / "Reserve not met — not sold" (ended with bids, no winner, `hasReserve && !reserveMet`) / Ended with no bids. In the unsold cases the seller gets a "Relist" link to `/sell/new?from=<auctionId>` (pre-fills the form, see `auctions.md`); winner sees "You won!" plus seller contact; seller sees winner contact plus commission note (`/sell/commissions`). `contact` only arrives for those two viewers. **Checkout sale** (`auction.sale = { id, status, payBy }`, buyer / seller / admin only): the winner sees `BuyerSaleEntry` instead of the contact card (AWAITING_PAYMENT: "Pay now" -> `/purchases/<id>` plus "Pay by <date>"; any other status: badge + "View purchase"), the seller sees the status badge + "View sale" -> `/sell/sales/<id>` instead of the winner contact and commission note. Legacy auctions without a sale keep the contact card. `/my-bids` Won rows use `saleId` / `saleStatus` the same way (the old "Seller contact" button stays for rows without a sale). See `checkout.md`.

## Pages
- `/my-bids` (bidder): `GET /bids/mine?tab=`; rows show "your max ₹X" when `myMaxBidPaise` is set; outbid cards link "Bid again".
- `/sell/auctions/[id]` (auctioneer): summary, reserve (amount + met/not met) and Buy It Now price, result, full history, edit/delete when no bids.
- `/notifications` (member) and the header `NotificationBell`: `GET /notifications`, mark one/all read. Unread count (`GET /notifications/unread-count` -> `{ count }`) is polled every 60 s while visible and also feeds the app-icon badge (`features/push`).
