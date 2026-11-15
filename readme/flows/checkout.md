# Winner checkout flow (frontend)

Code: `src/features/sales/`, `src/features/payments/` (shared payment hook), pages `src/app/(bidder)/purchases/**`, `src/app/(auctioneer)/sell/sales/**`, `src/app/(admin)/admin/sales/page.tsx`. Backend: Razorpay Route (payment goes to the seller's linked account, the platform keeps the commission). Seller onboarding and the platform switch are in `payouts.md`; commission payments in `payments.md`.

## Model
When an auction sells and the seller has an ACTIVE payout account, the API creates a **Sale**. Statuses: `AWAITING_PAYMENT` -> `PAID` -> `SHIPPED` -> `DELIVERED` -> `RELEASED` (payout released), or `DISPUTED`, `REFUNDED`, `CANCELLED`. `SaleDTO.role` (`BUYER` / `SELLER` / `ADMIN`) is who is looking. Auction detail carries `sale: { id, status, payBy } | null`; `/my-bids` rows carry `saleId` / `saleStatus`. Legacy auctions (no sale) keep the old seller-contact flow.

## Routes and entry points
| Route | Who | Purpose |
|---|---|---|
| `/purchases` | BIDDER | `SaleList role="buyer"`: status tabs (All / Awaiting payment / Paid / Shipped / Completed / Disputed), infinite scroll (`SALES_PAGE_SIZE` 20) |
| `/purchases/[id]` | BIDDER | `SaleDetailPage view="buyer"`: item, amount breakdown, progress timeline, seller contact once paid, delivery info, `PurchaseActions` |
| `/sell/sales` | AUCTIONEER | `SaleList role="seller"`, same tabs; "Ship" shortcut on PAID rows |
| `/sell/sales/[id]` | AUCTIONEER | Same detail view: buyer contact once paid, payout + commission rows, `ShipForm` when PAID |
| `/admin/sales` | SUPER_ADMIN | Table / cards, status tabs + `q` search, `AdminSaleActions` |

Entry points: `AuctionResult` and `/my-bids` Won rows (`BuyerSaleEntry`: AWAITING_PAYMENT = "Pay now" + pay-by date, otherwise badge + "View purchase"); sellers get "View sale". Nav: Purchases (BIDDER), Sales + Payouts (AUCTIONEER), Sales (admin). Route gating is in `src/constants/routes.ts` (`BIDDER_PREFIXES` has `/purchases`; `/sell/*` and `/admin/*` already cover the rest).

## Buyer actions (`purchase-actions.tsx`, rules in `saleActions()` in `sales.utils.ts`)
- **Pay ₹X**: AWAITING_PAYMENT and before `payBy` (afterwards "The payment window ... has closed"). `useSalePayment(confirmStub)` = `useRazorpayPayment` with `POST /sales/:id/checkout` (same payload as the commission checkout, `keyId === 'stub'` = test mode with the "Test mode" `ConfirmDialog` from `useStubPaymentConfirm`), then `POST /payments/verify` (returns `referenceType: 'SALE'`). Watcher asks `GET /sales/:id` whether the status left AWAITING_PAYMENT. Invalidates `['sales']`, `['auction']`, `['my-bids']`, `['notifications']`, `['me']`.
- **Confirm received** (PAID / SHIPPED): `ConfirmDialog` "This releases the payment to the seller." -> `POST /sales/:id/confirm`.
- **Report a problem** (PAID / SHIPPED / DELIVERED): `DisputeDialog` (RHF + zod `disputeSchema`, reason 10..1000, trimmed) -> `POST /sales/:id/dispute`.

## Phase E additions
- `POST /payments/verify` also returns `referenceType: 'DEPOSIT'` (bid deposits, `deposits.md`).
- Seller view of a CANCELLED sale (`SaleDTO.secondChanceOffer`, `canOfferSecondChance`): `SellerOfferCard` offers the item to the runner-up; accepting creates a new AWAITING_PAYMENT sale the bidder pays at `/purchases/<newSaleId>`. `/purchases` starts with an Offers section and `/purchases/offers/[id]` is the offer page. See `strikes.md`.
- `/purchases` shows the strike warning banner when `activeStrikes > 0`.

## Seller action (`ship-form.tsx`)
PAID only. Delivery method radio COURIER / PICKUP; courier required for COURIER (max 60), tracking number optional (max 60) -> `POST /sales/:id/ship` (`toShipPayload` omits empty fields; PICKUP sends no courier).

## Admin actions (`admin-sale-actions.tsx`)
PAID / SHIPPED / DELIVERED / DISPUTED: **Release** (`POST /admin/sales/:id/release`) and **Refund** (`POST /admin/sales/:id/refund`, optional note max 500) through `<ConfirmDialog>`. Both invalidate `['admin']` and `['sales']`.

## Form validation (zod, `sales.schema.ts`)
`disputeSchema { reason: 10..1000 }`, `shipSchema { method, courier (required when COURIER, <=60), trackingNo (<=60) }`.

## Data and errors
- Keys: `['sales','mine',role,status]` (infinite), `['sales','one',id]`; admin `['admin','sales',...]` via `useAdminList`.
- `sales.parse.ts` is the only place sale keys are mapped (optional `commissionPaise`, `payoutPaise`, `buyerContact`, `sellerContact` are omitted when absent).
- `sales.errors.ts`: `SALE_NOT_FOUND`, `SALE_NOT_PAYABLE`, `PAYOUT_ACCOUNT_INACTIVE`, `SALE_INVALID_STATE` (the last three also refetch the sale lists via `isStaleSaleError`); payment errors fall back to the shared Razorpay codes in `commissions.errors.ts`.
- Notifications `sale-receipt`, `sale-paid`, `sale-shipped`, `sale-released`, `sale-disputed`, `sale-refunded`, `sale-cancelled` render through the generic notification item; their urls are `/purchases/<id>` and `/sell/sales/<id>`.

## Contract assumptions (not yet confirmed against bids-api)
Admin Release / Refund buttons show for PAID, SHIPPED, DELIVERED and DISPUTED; `POST /sales/:id/*` action responses return the sale (also accepted as `{ sale }`); the admin list rows come back as `SaleDTO` (role is forced to ADMIN client-side for the action rules).
