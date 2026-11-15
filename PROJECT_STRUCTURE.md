# PROJECT_STRUCTURE.md — bids-app

```
src/
  app/
    layout.tsx, manifest.ts, globals.css   root shell, web manifest, theme tokens
    page.tsx                         root: redirect('/login') (P2X pattern; signed-in users are sent home by the edge gate). The marketing site is the separate bids-website repo
    (public)/                        public pages, rendered in the app shell (guest mode when logged out) via PublicShell; layout.tsx
      auctions/, auctions/[id]/      browse (filters, sort, infinite scroll, recently viewed) and auction detail (server-rendered + live)
      leaderboard/, sellers/[id]/    ranking (podium + table), seller profile (tabs + infinite scroll)
      pages/[slug]                   legal pages (server-rendered from GET /settings/legal/:slug)
      suspended/                     deactivated-account page
    (auth)/                          guest-only: /login, /signup (+ email OTP verify), /forgot-password, /reset-password
    (member)/                        BIDDER / AUCTIONEER: /watchlist, /profile, /notifications
    (bidder)/my-bids                 BIDDER only; tabs Winning / Outbid / Won / Lost
    (auctioneer)/                    AUCTIONEER only; /sell/* (auctions list, new, edit, auctions/[id] = bids + result, commissions = pay via Razorpay)
    (admin)/                         SUPER_ADMIN only: /admin (dashboard + charts), /admin/members, auctions, commissions, payments, reviews, settings, profile
    sitemap.ts, robots.ts            SEO (app public pages + /auctions/sitemap, fail-soft); public/og-image.png = default OG image
  components/
    ui/                              shadcn/Radix primitives
    common/                          generic app components (confirm-dialog, auth-guard, countdown, responsive-list, infinite-scroll,
                                     form-input, otp-*, pwa-*, push-permission-prompt, offline-banner, theme-toggle, profile-page (shared by /profile and /admin/profile), ...)
    layout/                          dashboard-shell (guest prop), public-shell (DashboardShell for the public pages, guest or member mode),
                                     shell-footer (website + legal links), mobile-bottom-nav, more-page, nav-items (member / admin / guest nav,
                                     watchlist badge), user-menu, pinch-zoom
  constants/                         api.ts (API_ORIGIN, proxy mode), routes.ts (route tables + gateFor), website.ts (WEBSITE_URL, links to the website), legal.ts, apple-splash-devices.json
  features/                          one folder per feature: *.api.ts, *.parse.ts, *.schema.ts, *.types.ts, use-*.ts, components/
    auth/                            auth.api/schema/errors, use-auth, components/{verify-email-step,forgot-password-flow}
    members/, uploads/               profile + devices (use-members); presigned S3 upload (use-upload)
    auctions/                        auctions.api/server/parse/schema/filters/types, use-auctions, use-image-uploader,
                                     components/{auction-card,auction-grid,auction-list,auction-detail,auction-form,auction-filters,
                                     auction-gallery,new-auction,republish-dialog,recently-viewed,share-buttons}
    bids/                            bids.api/parse/types/errors/utils, use-bids, components/{bid-panel,bid-history,auction-result}
    live/                            live-socket (WS client), live-socket-provider, use-auction-live, live.reducers/types/api, components/live-indicator
    commissions/                     commissions.api/parse/types/errors, use-commissions, use-pay-commission, components/unpaid-commission-banner
    payments/                        payments.api (POST /payments/verify); checkout loader in lib/razorpay.ts
    notifications/                   api, use-notifications, components/{notification-bell,notification-item}
    push/                            push.api, use-push (Web Push subscribe / unsubscribe)
    watchlist/                       api, use-watchlist (['watchlist-ids'], ['watchlist'], optimistic toggle), components/{watch-button,watchlist-view}
    reviews/                         reviews.api/types/schema/errors, use-reviews, components/{star-rating,review-dialog,rate-seller-button,review-item,seller-reviews}
    questions/                       questions.api/types/schema/errors, use-questions, components/questions-section
    saved-searches/                  saved-searches.api/types/schema/errors/utils, use-saved-searches, components/{save-search-button,alerts-card}
    leaderboard/                     leaderboard.server, components/leaderboard-view (podium, table)
    sellers/                         sellers.server, components/seller-auctions
    settings/                        settings.server (public settings, legal docs)
    legal/                           legal.api/schema, use-legal (admin legal page editing)
    admin/                           admin.api/parse/schema/types, use-admin, use-url-state,
                                     components/{admin-list,admin-charts,marketplace-settings,legal-settings,copy-button}
  hooks/                             use-client-state, use-login-href (login/signup URL with ?next=), use-is-mobile, use-is-narrow-content, use-resend-cooldown
  lib/                               api-client, server-api, query-client, paged + pagination, site (SITE_URL), pwa, push, razorpay,
                                     engagement, assets, device-info, utils (cn, formatINR, dates), zod
  providers/                         Providers (Query + theme + tooltip + toaster), AuthBootstrap
  store/                             zustand: auth-store, live-store (socket status), recently-viewed-store (persisted)
  proxy.ts                           edge route gate (nb_at / nb_rt cookies, role gating via gateFor)
public/                              sw.js, version.json, icons/, splash/, brand/logo-source.png, logo, favicons, og-image, avatar-default
scripts/                             gen-version, generate-icons, generate-apple-splash, generate-notification-icons
e2e/                                 Playwright suite (see e2e/README.md)
docs/, readme/                       guides: methods/, ui/, theming/, flows/ (admin, auctions, bidding, deployment, payments, push-notifications, pwa, seo, watchlist, websocket, reviews, questions, saved-searches)
```
