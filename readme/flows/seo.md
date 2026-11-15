# SEO

- The app only owns the SEO of its own public pages (`/auctions`, `/auctions/[id]`, `/sold`, `/leaderboard`, `/sellers/[id]`, `/pages/*`). The landing page, About, How it works and Contact belong to the separate `bids-website` repo, which has its own sitemap and robots.
- Origin: `NEXT_PUBLIC_SITE_URL` via `src/lib/site.ts` (`SITE_URL`; live `https://bidsapp.shubsale.in`); root metadata sets `metadataBase`, default Open Graph + Twitter image `public/og-image.png`.
- `src/app/sitemap.ts`: `/auctions`, `/sold`, `/leaderboard`, the legal pages (`PUBLIC_LEGAL_PAGES`) + every auction from `GET /auctions/sitemap` (`{ items: { id, updatedAt } }`), revalidated hourly. If the API fails it returns only the static list. Seller pages are not listed (no list endpoint); crawlers reach them from the auction pages.
- `src/app/robots.ts`: allows `/`, disallows `/sell`, `/admin`, `/profile`, `/my-bids`, `/watchlist`, `/notifications` and the guest-only auth pages; points at `/sitemap.xml`.
- `generateMetadata` on `/auctions` (category in the title when filtered, canonical includes the category), `/leaderboard`, `/sellers/[id]`, and `/pages/[slug]`. The public pages render inside the app shell (guest mode), but stay server components, so the metadata and HTML are unchanged for crawlers.
- `/auctions` emits `ItemList` JSON-LD for the server-fetched first page; auction detail already emits `Product` + `Event`.
- `/pages/[slug]`: server-rendered from `GET /settings/legal/:slug` (slugs in `PUBLIC_LEGAL_SLUGS`), sanitised by `RichText`; unknown slug or API 404 -> 404.
- `/watchlist` is `noindex` and disallowed in robots.
- `/sold`: public sold archive with its own title, description and canonical (`/sold`), `ItemList` JSON-LD for the first page, listed in the sitemap (daily). Ended auction detail pages (sold or not) carry no `noindex`: `generateMetadata` sets only title, description, canonical and Open Graph, and the sitemap lists every auction from `/auctions/sitemap`, so sold lots stay indexable.
