# SEO

- Origin: `NEXT_PUBLIC_SITE_URL` via `src/lib/site.ts` (`SITE_URL`); root metadata sets `metadataBase`, default Open Graph + Twitter image `public/og-image.png`.
- `src/app/sitemap.ts`: static pages + `GET /auctions/sitemap` (`{ items: { id, updatedAt } }`), revalidated hourly. If the API fails it returns only the static list.
- `src/app/robots.ts`: allows `/`, disallows `/sell`, `/admin`, `/profile`, `/my-bids`, `/watchlist`, `/notifications`; points at `/sitemap.xml`.
- `generateMetadata` on `/auctions` (category in the title when filtered, canonical includes the category), `/leaderboard`, `/sellers/[id]`, `/pages/[slug]` and the static pages.
- `/auctions` emits `ItemList` JSON-LD for the server-fetched first page; auction detail already emits `Product` + `Event`.
- `/pages/[slug]`: server-rendered from `GET /settings/legal/:slug` (slugs in `PUBLIC_LEGAL_SLUGS`), sanitised by `RichText`; unknown slug or API 404 -> 404.
- `/watchlist` is `noindex` and disallowed in robots.
