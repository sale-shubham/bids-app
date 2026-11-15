# Auctions (browse, detail, selling)

Code: `src/features/auctions/`, pages `src/app/(public)/auctions/`, `src/app/(auctioneer)/sell/`. API side: `../bids-api/readme/flows/auctions.md`.

## App shell and the website
There is no Home page in the app: the landing page, About, How it works and Contact live in the separate `bids-website` repo, and `/` here is just `redirect('/login')` (signed-in users never see it). Browse and detail are public pages in `src/app/(public)/`, rendered inside the same `DashboardShell` as the signed-in area through `PublicShell` (`components/layout/public-shell.tsx`). Logged out they run in **guest mode**: nav = Auctions + Leaderboard, header "Log in" / "Sign up" (both carry `?next=<current page>`, `useAuthHref`), a "Log in" tab on the phone bottom bar, footer links (`ShellFooter`) to the website's About / How it works / Contact (absolute links from `NEXT_PUBLIC_WEBSITE_URL`) and the in-app legal pages. Guests can browse and watch live bids; bidding and watching send them to `/login?next=`. A signed-in member / admin sees their own nav on the same pages. Page bodies lay out with container queries (`@lg/content:` etc.), like every page in the shell.

## Browse (`/auctions`)
- Server-rendered first page + `generateMetadata`; then client `useInfiniteQuery` with key `['auctions', filters]` and `InfiniteScroll`. A client `RecentlyViewed` strip (device-local, see below) sits under the list.
- Filters live in the URL (`auctions.filters.ts`: `parseFilters` / `filtersToParams`, defaults omitted so URLs stay clean): `status` (`live` default, `upcoming`, `ended`), `q` (max 100 chars), `category`, `condition` (`NEW` / `USED`), `minPrice` / `maxPrice` in rupees, `sort` (`endingSoon` default, `newest`, `priceAsc`, `priceDesc`, `mostBids`). Unknown values fall back to defaults.
- Categories: `useCategories()` (`['auctions', 'categories']`, stale 5 min).

## Detail (`/auctions/[id]`)
- Server component with `generateMetadata` (title, description, OG image) via `getAuctionDetailServer()`; the client `AuctionDetailView` then keeps `['auction', id]` in the TanStack Query cache, and `features/live` updates it from WebSocket frames (`websocket.md`).
- Parts: `AuctionGallery` (+ `ImageLightbox`), `Countdown`, bid panel and history (`bidding.md`), `WatchButton` (`watchlist.md`), `ShareButtons`.
- `ShareButtons`: Copy link (clipboard), WhatsApp (`wa.me/?text=`), and the native share sheet when `navigator.share` exists.
- Owner tools on the detail page (shown to the auction's own seller only; SUPER_ADMIN manages auctions under `/admin/auctions`): edit / delete only while `bidCount === 0` and the auction is not ENDED / CANCELLED. Delete uses `<ConfirmDialog>`.
- Recently viewed: each visit adds an `AuctionCard` snapshot to `recently-viewed-store` (shown by `RecentlyViewed` on `/auctions`; zustand `persist`, localStorage key `nb-recently-viewed`, newest first, max 10, `skipHydration` + `rehydrate()` after mount to avoid a hydration mismatch; storage errors fall back to memory).

## Selling (`/sell/*`, AUCTIONEER only)
- `UnpaidCommissionBanner` sits in the auctioneer layout. `AuctionForm` blocks creating a new auction while `member.unpaidCommissionPaise > 0` and links to `/sell/commissions` (the API enforces the same rule).
- `/sell/new` and `/sell/auctions/[id]/edit` share `AuctionForm` (zod schema in `auctions.schema.ts`): title 5–120 chars, description 20–10,000 chars (rich text, sanitised by the API), category, condition `NEW` / `USED`, 1–8 images, starting bid and optional minimum increment (≥ ₹1) in rupees (converted to paise on submit), start now or at a date/time, preset duration or custom end.
- Images: `use-image-uploader` -> `use-upload` gets a presigned S3 URL (`POST /uploads/presign`) and PUTs the file directly; JPG / PNG / WebP, max 5 MB each, up to 8, first image is the cover. No client-side resize.
- `/sell/auctions`: the seller's auctions (`['auctions', 'mine', status]`, infinite). Editable while `bidCount === 0` and SCHEDULED / LIVE; `RepublishDialog` for ENDED auctions with no bids; delete with `<ConfirmDialog>`.
- `/sell/auctions/[id]`: bids received and the result (winner contact after a sale, commission note).
- Mutations invalidate `['auctions']` and `['auction', id]`.
