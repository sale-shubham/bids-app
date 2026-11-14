# PROJECT_STRUCTURE.md — bids-app

```
src/
  app/
    layout.tsx, manifest.ts, globals.css, icon.svg, page.tsx   root shell + Home placeholder
    (auth)/login, (auth)/signup      guest-only auth pages (placeholders until Phase 1)
    (member)/                        any signed-in role: /watchlist, /profile, /notifications
    (bidder)/my-bids                 tabs Winning / Outbid / Won / Lost
    (auctioneer)/                    /sell/* (auctions list, new, edit, auctions/[id] = bids + result, commissions = pay via Razorpay)
    (admin)/                         /admin/* (layout only so far)
    pages/[slug]                     public legal pages (server-rendered from GET /settings/legal/:slug)
    leaderboard/, sellers/[id]/      public: ranking (podium + table), seller profile (tabs + infinite scroll)
    about/, how-it-works/, contact/  public static pages (how-it-works reads commission % from /settings/public)
    sitemap.ts, robots.ts            SEO (static pages + /auctions/sitemap, fail-soft); public/og-image.png = default OG image
    suspended/                       deactivated-account page
  components/
    ui/                              shadcn/Radix primitives
    common/                          generic app components (confirm-dialog, form-input, otp-*, pwa-*, ...)
    layout/                          dashboard-shell, mobile-bottom-nav, more-page, pinch-zoom, nav-items (watchlist badge), public-header, site-footer, public-page (header+main+footer shell)
  constants/                         api.ts, routes.ts (route tables), legal.ts, apple-splash-devices.json
  features/                          auth, auctions, bids, notifications, push, payments, legal, admin  (*.api.ts, *.parse.ts, *.schema.ts, use-*.ts)
    bids/                            bids.api/parse/types/errors/utils, use-bids, components/{bid-panel,bid-history,auction-result}
    commissions/                     commissions.api/parse/types/errors, use-commissions, use-pay-commission, components/unpaid-commission-banner
    payments/                        payments.api (POST /payments/verify); checkout loader in lib/razorpay.ts
    live/                            live-socket (WS client), live-socket-provider, use-auction-live, live.reducers/types/api, components/live-indicator
    notifications/                   api, use-notifications, components/{notification-bell,notification-item}
    watchlist/                       api, use-watchlist (['watchlist-ids'], ['watchlist'], optimistic toggle), components/{watch-button,watchlist-view}
    leaderboard/                     leaderboard.server, components/{Podium,LeaderboardTable,TopBidders}
    sellers/                         sellers.server, components/seller-auctions
    settings/                        settings.server (public settings, legal docs, formatBps)
    contact/                         contact.schema/api, contact-form
  hooks/                             use-client-state, use-is-mobile, use-is-narrow-content, use-resend-cooldown
  lib/                               site (SITE_URL), paged (paginated envelope decoding), api-client, query-client, pwa, push, razorpay, assets, device-info, utils, zod
  providers/                         Providers (Query + theme + tooltip + toaster), AuthBootstrap, LiveSocketProvider (features/live)
  store/auth-store.ts                zustand auth store
  proxy.ts                           edge route gate (nb_at / nb_rt cookies, role gating)
public/                              sw.js, avatar-default.png  (icons/splash generated later)
scripts/                             gen-version, generate-icons, generate-apple-splash, generate-notification-icons
docs/, readme/                       guides (methods, theming, ui); flows/bidding.md, flows/websocket.md
```
