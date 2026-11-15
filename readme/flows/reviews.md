# Seller reviews

Only the winner of an ended auction can rate its seller (one review per auction, 1-5 stars + optional comment up to 1000 chars). The seller may reply once. Admins can hide a review (it then stops counting towards the rating).

## API
- `POST /auctions/:id/review` `{ rating, comment? }` -> `{ review }`; errors `REVIEW_NOT_ALLOWED` (403), `ALREADY_REVIEWED` (409).
- `POST /reviews/:id/reply` `{ reply }` -> `{ review }`; error `ALREADY_REPLIED` (409).
- `GET /members/:id/reviews?page&pageSize` (standard paginated envelope, `parsePaged`).
- `GET /members/:id/public`, every auction card/detail `seller` object: `ratingAvg` (null when none) + `ratingCount`.
- Auction detail: `review` (ReviewDTO or null) + `canReview`. My-bids rows: `canReview`.
- Admin: `GET /admin/reviews?hidden=&q=&page&pageSize`, `PATCH /admin/reviews/:id` `{ hidden }`.

## Code (`src/features/reviews/`)
- `reviews.types.ts`, `reviews.schema.ts` (`reviewSchema`, `replySchema`, `toReviewPayload` omits an empty comment), `reviews.errors.ts` (`reviewErrorMessage`), `reviews.api.ts`, `use-reviews.ts`.
- Query keys: `['reviews', 'seller', id]` (infinite, page size 10); admin list is `['admin', 'reviews', ...]` through `useAdminList`. `useCreateReview` invalidates `['auction', id]`, `['my-bids']`, `['reviews']`; `useReplyToReview` `['reviews']` + `['auction']`; `useSetReviewHidden` `['admin']`, `['reviews']`, `['auction']`, `['auctions']`.
- Components: `StarRatingInput` (radio group, arrow keys), `StarDisplay`, `RatingSummary` (star 4.6 (12) / "No ratings yet"), `ReviewDialog` ("Rate the seller", RHF + zod), `RateSellerButton` (button that owns the dialog), `ReviewItem` (with seller reply; "Reply" form for the seller when no reply yet), `SellerReviews` (infinite list).

## Where it shows
- `AuctionResult` (detail page, closed auction): "Rate the seller" when `canReview`; the review (stars, comment, seller reply) once `review` exists.
- `/my-bids` Won tab: "Rate the seller" on rows with `canReview`.
- Auction detail seller card and seller page header: `RatingSummary`. `/sellers/[id]` lists reviews under the auctions; the signed-in seller sees "Reply" on unanswered ones.
- `/admin/reviews`: visible / hidden / all tabs, search, Hide / Unhide through `<ConfirmDialog>`.
- Seller `ratingAvg` / `ratingCount` are optional on `AuctionSeller` because recently-viewed snapshots predate them.
- Notification type `review-received` is rendered by the generic inbox.
