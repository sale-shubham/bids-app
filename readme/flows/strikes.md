# Strikes and second-chance offers (frontend)

Code: `src/features/strikes/`, `src/features/second-chance/`, `src/features/sales/components/sale-detail-page.tsx`, pages `/purchases`, `/purchases/offers/[id]`, `/my-bids`, `/sell/sales/[id]`, `/admin/members`. Backend: `bids-api` `modules/strikes`, `modules/second-chance`.

## Strikes
A buyer who does not pay in time gets a strike (reason `UNPAID`). A strike expires after 12 months. With 2 active strikes every bid needs a deposit (`deposits.md`); with 3 the account is suspended.
- `GET /members/me` carries `activeStrikes` (`AuthMember.activeStrikes?`, optional until `['me']` refetches). `StrikeBanner` (`features/strikes/components/strike-banner.tsx`) renders a warning ("You have N strike(s) for unpaid purchases. With 2, every bid needs a deposit; with 3 your account is suspended. Strikes expire after 12 months.") on `/my-bids` and `/purchases` when it is above 0.
- Admin members (`/admin/members`): the admin member DTO has `activeStrikes`; a "N strikes" badge shows in the trust badges and a **Strikes** button opens `MemberStrikesDialog` (`GET /admin/members/:id/strikes` -> `{ items: [{ id, saleId, auction?, reason, createdAt, expiresAt, removedAt, note, active }] }`). **Remove** (active strikes only) opens a destructive `ConfirmDialog` with an optional note (max 500) -> `POST /admin/strikes/:id/remove { note? }`. Removing does not reactivate a suspended member (use the member's Activate action). Invalidates `['admin']`.
- Errors (`strikes.errors.ts`): `STRIKE_NOT_FOUND`, `STRIKE_ALREADY_REMOVED` (both refetch the list).

## Second-chance offers
When a sale is CANCELLED (the buyer did not pay) the seller can offer the item to the runner-up at their maximum bid, valid 48 h.
- **Seller** (`/sell/sales/[id]`, `SellerOfferCard` under the ship form): the seller `SaleDTO` has `secondChanceOffer: OfferDTO | null` and `canOfferSecondChance`. With `canOfferSecondChance` the card shows **Offer to the runner-up**; a `ConfirmDialog` explains it offers the item to the next-highest bidder at their maximum bid, valid 48 hours -> `POST /sales/:id/second-chance` -> `{ offer }`. With an offer it shows the status (Pending with countdown, Accepted, Declined, Expired). Errors `OFFER_EXISTS`, `NO_RUNNER_UP` (and `SALE_INVALID_STATE`) map to friendly copy; stale ones refetch.
- **Bidder, list** (`/purchases`): the "Offers" tab (`?tab=offers`, label shows the pending count; `OffersList`) lists PENDING offers from `GET /second-chance-offers/mine` (`{ items }`) with price, countdown and a "View offer" link; shows an empty state when there are none.
- **Bidder, detail** (`/purchases/offers/[id]`, `OfferDetailPage`): `GET /second-chance-offers/:id` -> `{ offer }`; item, price, status, countdown to `expiresAt` (server clock). **Accept offer** (`ConfirmDialog` "You agree to buy this for ₹X. Pay within 3 days.") -> `POST /second-chance-offers/:id/accept` -> `{ offer, saleId }` (a `sale` object is also accepted) -> `router.push('/purchases/<newSaleId>')`. **Decline** (destructive `ConfirmDialog`) -> `POST .../decline` -> `{ offer }`. An EXPIRED offer, or a PENDING one whose countdown hit zero, shows "This offer has expired." with no actions. Errors: `OFFER_NOT_FOUND`, `OFFER_NOT_PENDING`, `OFFER_EXPIRED` (refetch), `PAYOUT_ACCOUNT_INACTIVE` on accept.
- Route gating: `/purchases/offers/*` is covered by `MEMBER_PREFIXES` (`/purchases`), asserted in `routes.test.ts`.
- Keys: `['second-chance', 'mine' | 'one', id]`; every offer mutation invalidates `['second-chance']`, `['sales']`, `['auction']`, `['my-bids']`, `['notifications']`. `second-chance.parse.ts` is the only place offer keys are mapped; `sales.parse.ts` maps the seller fields.
- Notifications `second-chance-offer` (url `/purchases/offers/<id>`), `second-chance-accepted`, `second-chance-declined`, `strike-issued`, `account-suspended` render through the generic notification item.

## Contract assumptions
Matched to `../bids-api/src`: all routes, DTO shapes and error codes above. The accept response carries `saleId` (not `sale`); the client accepts both. Not confirmed: the new sale's pay-by window ("Pay within 3 days" is copy only).
