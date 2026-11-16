# Featured listings (paid promotion)

Code: `src/features/featured/` (`featured.api/types/errors.ts`, `use-featured.ts`, `components/{promote-card,promoted-strip}.tsx`), badge in `features/auctions/components/auction-card.tsx`, strip mounted in `src/app/(public)/auctions/page.tsx`, card mounted in `src/app/(member)/sell/auctions/[id]/page.tsx`. Admin switch and prices: `readme/flows/admin.md`.

## Contract
- Public settings: `featuredEnabled`, `featuredPrices { "1","3","7": paise }` (`settings.api.ts`, `PublicSettings`). Everything below is hidden when `featuredEnabled` is false.
- `GET /auctions/:id/feature` (owner) -> `{ featuredUntil, purchases[] }`; `POST /auctions/:id/feature/checkout { days, useCredits? }` -> `{ paidWithCredits: true, featuredUntil }` or the standard checkout payload (then `POST /payments/verify`, `referenceType: 'FEATURE'`).
- `AuctionCard.promoted` -> "Promoted" badge (bottom-right of the cover). `GET /auctions/promoted?category=<slug>&limit=2` -> `{ items }`.
- Errors (`featured.errors.ts`): `AUCTION_ENDED`, `FEATURE_DISABLED`, `INSUFFICIENT_CREDITS`; payment codes fall through to `commissionErrorMessage`.

## Promote card (`PromoteCard`, seller manage page)
Hidden when promotions are off or the auction is `ENDED`/`CANCELLED`. Shows "Promoted until <date>" (server time via `useServerNow`), a radio group of 1 / 3 / 7 day options with prices (default 3), a "Pay with credits (balance X)" checkbox only when `useCreditBalance()` covers the selected price, a Pay button and the purchase history.
- Card: `usePromoteAuction().payWithCard(days)` runs `useRazorpayPayment` (`pay(String(days))`; stub confirm in test mode) then `/payments/verify`.
- Credits: opens a `ConfirmDialog`, then `createFeatureCheckout(id, { days, useCredits: true })`. Either path invalidates `['auction-feature', id]`, `['auction', id]`, `['auctions']`, `['referral']`, `['credits']`, `['me']`.

## Promoted strip (`PromotedStrip`)
On `/auctions` with a category filter, up to 2 promoted auctions render under a "Promoted" heading above the results (`usePromoted(category)`, key `['auctions','promoted',category]`). A promoted auction can also appear in the list below (not de-duplicated). The home feed ordering is server-side.
