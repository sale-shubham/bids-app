# PROJECT_STRUCTURE.md — bids-app

```
src/
  app/
    layout.tsx, manifest.ts, globals.css   root shell, web manifest, theme tokens
    page.tsx                         root: redirect('/login') (P2X pattern; signed-in users are sent home by the edge gate). The marketing site is the separate bids-website repo
    (public)/                        public pages, rendered in the app shell (guest mode when logged out) via PublicShell; layout.tsx
      auctions/, auctions/[id]/      browse (filters, sort, infinite scroll, recently viewed) and auction detail (server-rendered + live)
      sold/                          public sold archive (server-rendered first page + infinite scroll)
      leaderboard/, sellers/[id]/    ranking (podium + table), seller profile (tabs + infinite scroll)
      pages/[slug]                   legal pages (server-rendered from GET /settings/legal/:slug)
      suspended/                     deactivated-account page
    (auth)/                          guest-only: /login, /signup (+ email OTP verify), /forgot-password, /reset-password
    (member)/                        BIDDER / AUCTIONEER: /watchlist, /profile, /notifications
    (bidder)/my-bids                 BIDDER only; tabs Winning / Outbid / Won / Lost
    (bidder)/purchases, purchases/[id]  BIDDER only; checkout list + detail (pay, confirm received, report a problem)
    (auctioneer)/                    AUCTIONEER only; /sell/* (auctions list, new, edit, bulk = CSV bulk upload, auctions/[id] = bids + result, commissions = pay via Razorpay, sales + sales/[id] = ship + payout amounts, payouts = payout account onboarding, analytics = seller analytics)
    (admin)/                         SUPER_ADMIN only: /admin (dashboard + charts), /admin/members, auctions, commissions, payments, sales (release / refund), invoices, reviews, reports, risk (shill-bid queue), settings (incl. checkout mode + bid deposits), profile
    sitemap.ts, robots.ts            SEO (app public pages + /auctions/sitemap, fail-soft); public/og-image.png = default OG image
  components/
    ui/                              shadcn/Radix primitives
    common/                          generic app components (page-header, list-toolbar, row-actions-menu, confirm-dialog, auth-guard, countdown, responsive-list, infinite-scroll,
                                     form-input, otp-*, pwa-*, push-permission-prompt, offline-banner, theme-toggle, profile-page (shared by /profile and /admin/profile), ...)
    layout/                          dashboard-shell (guest prop), public-shell (DashboardShell for the public pages, guest or member mode),
                                     shell-footer (website + legal links), mobile-bottom-nav, more-page, nav-items (member / admin / guest nav,
                                     watchlist badge), user-menu, pinch-zoom
  constants/                         api.ts (API_ORIGIN, proxy mode), routes.ts (route tables + gateFor), website.ts (WEBSITE_URL, links to the website), legal.ts, apple-splash-devices.json
  features/                          one folder per feature: *.api.ts, *.parse.ts, *.schema.ts, *.types.ts, use-*.ts, components/
    auth/                            auth.api/schema/errors, use-auth, components/{verify-email-step,forgot-password-flow}
    members/, uploads/               profile + devices (use-members); presigned S3 upload (use-upload, resize-image = client WebP resize, use-video-upload)
    auctions/                        auctions.api/server/parse/schema/filters/types, use-auctions, use-image-uploader,
                                     components/{auction-card,auction-grid,auction-list,auction-detail,auction-form,auction-filters,
                                     auction-gallery,video-upload-field,similar-sold,new-auction,republish-dialog,recently-viewed,share-buttons}
    bulk/                            bulk.csv (template, papaparse, row mapping + validation, file matching), bulk.api/errors/types, use-bulk, components/{bulk-upload,bulk-preview-table}
    bids/                            bids.api/parse/types/errors/utils, use-bids, components/{bid-panel,bid-history,auction-result}
    live/                            live-socket (WS client), live-socket-provider, use-auction-live, live.reducers/types/api, components/live-indicator
    commissions/                     commissions.api/parse/types/errors, use-commissions, use-pay-commission, components/unpaid-commission-banner
    payments/                        payments.api (POST /payments/verify), payments.types, use-razorpay-payment (generic), use-stub-payment-confirm; checkout loader in lib/razorpay.ts
    sales/                           sales.api/parse/types/schema/utils/errors, use-sales, components/{sale-status-badge,sale-list,sale-detail,sale-detail-page,purchase-actions,ship-form,buyer-sale-entry}
    payouts/                         payouts.api/parse/types/schema/errors, use-payouts, components/{payout-account-panel,payout-status-card,payout-form,payout-required-gate}
    notifications/                   api, use-notifications, components/{notification-bell,notification-item}
    push/                            push.api, use-push (Web Push subscribe / unsubscribe)
    watchlist/                       api, use-watchlist (['watchlist-ids'], ['watchlist'], optimistic toggle), components/{watch-button,watchlist-view}
    reviews/                         reviews.api/types/schema/errors, use-reviews, components/{star-rating,review-dialog,rate-seller-button,review-item,seller-reviews}
    deposits/                        deposits.api/errors, use-deposit (pay), use-deposit-admin, components/{deposit-card,set-deposit-dialog}
    strikes/                         strikes.api/parse/types/errors, use-strikes, components/{strike-banner,member-strikes-dialog}
    second-chance/                   second-chance.api/parse/types/errors, use-second-chance, components/{offer-bits,seller-offer-card,offers-section,offer-detail-page}
    risk/                            risk.api/parse/types/utils/errors, use-risk (admin queue)
    featured/                        featured.api/types/errors, use-featured (promote, promoted), components/{promote-card,promoted-strip}
    referrals/                       referral-code (?ref= capture), referrals.api/types, use-referrals, components/{refer-card,credit-ledger}
    invoices/                        invoices.api/types/schema/errors, use-invoices, components/invoices-card
    reports/                         reports.api/types/constants/schema/errors, use-reports, components/{report-dialog,report-button}
    questions/                       questions.api/types/schema/errors, use-questions, components/questions-section
    follows/                         follows.api/errors, use-follows, components/{follow-button,following-card}
    notification-preferences/        .api/.errors, use-notification-preferences, components/notification-preferences-card
    analytics/                       analytics.api, use-analytics (view beacon), components/{seller-analytics-page,auction-analytics-section,analytics-charts,days-switch}
    follows/                         follows.api/errors, use-follows, components/{follow-button,following-card}
    notification-preferences/        .api/.errors, use-notification-preferences, components/notification-preferences-card
    analytics/                       analytics.api, use-analytics (view beacon), components/{seller-analytics-page,auction-analytics-section,analytics-charts,days-switch}
    saved-searches/                  saved-searches.api/types/schema/errors/utils, use-saved-searches, components/{save-search-button,alerts-card}
    leaderboard/                     leaderboard.server, components/leaderboard-view (podium, table)
    sellers/                         sellers.server, components/seller-auctions
    settings/                        settings.server (public settings, legal docs)
    legal/                           legal.api/schema, use-legal (admin legal page editing)
    admin/                           admin.api/parse/schema/types, use-admin, use-url-state,
                                     components/{admin-list,admin-charts,marketplace-settings,legal-settings,copy-button}
  hooks/                             use-client-state, use-login-href (login/signup URL with ?next=), use-is-mobile, use-is-narrow-content, use-resend-cooldown
  lib/                               api-client, server-api, query-client, paged + pagination, site (SITE_URL), pwa, push, razorpay, pdf (fetchPdfBlob, openPdfTab, showPdf),
                                     engagement, assets, device-info, utils (cn, formatINR, dates), zod
  providers/                         Providers (Query + theme + tooltip + toaster), AuthBootstrap
  store/                             zustand: auth-store, live-store (socket status), recently-viewed-store (persisted)
  proxy.ts                           edge route gate (nb_at / nb_rt cookies, role gating via gateFor)
public/                              sw.js, version.json, icons/, splash/, brand/logo-source.png, logo, favicons, og-image, avatar-default
scripts/                             gen-version, generate-icons, generate-apple-splash, generate-notification-icons
e2e/                                 Playwright suite (see e2e/README.md)
docs/, readme/                       guides: methods/, ui/, theming/, flows/ (admin, auctions, auth, bidding, deployment, payments, push-notifications, pwa, seo, watchlist, websocket, reviews, questions, saved-searches, reports, deposits, strikes, risk, follows, notification-preferences, analytics, featured, referrals, invoices)
```

### Phase F additions (categories)
- `src/features/categories/`: `categories.types/api/parse/schema/utils/errors`, `use-categories.ts`, `components/` (`category-picker`, `attribute-fields`, `attribute-schema-editor`, `category-dialog`, `admin-categories`), tests.
- `src/features/auctions/components/listing-info.tsx`: detail blocks (breadcrumb, estimate, specs, condition report, delivery).
- `src/app/(admin)/admin/categories/page.tsx`: admin category tree.
