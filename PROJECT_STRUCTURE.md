# PROJECT_STRUCTURE.md — bids-app

```
src/
  app/
    layout.tsx, manifest.ts, globals.css, icon.svg, page.tsx   root shell + Home placeholder
    (auth)/login, (auth)/signup      guest-only auth pages (placeholders until Phase 1)
    (member)/                        any signed-in role: /watchlist, /profile, /notifications
    (bidder)/my-bids                 tabs Winning / Outbid / Won / Lost
    (auctioneer)/                    /sell/* (auctions list, new, edit, auctions/[id] = bids + result)
    (admin)/                         /admin/* (layout only so far)
    pages/[slug]                     public legal pages (from API)
    suspended/                       deactivated-account page
  components/
    ui/                              shadcn/Radix primitives
    common/                          generic app components (confirm-dialog, form-input, otp-*, pwa-*, ...)
    layout/                          dashboard-shell, mobile-bottom-nav, more-page, pinch-zoom, nav-items
  constants/                         api.ts, routes.ts (route tables), legal.ts, apple-splash-devices.json
  features/                          auth, auctions, bids, notifications, push, payments, legal, admin  (*.api.ts, *.parse.ts, *.schema.ts, use-*.ts)
    bids/                            bids.api/parse/types/errors/utils, use-bids, components/{bid-panel,bid-history,auction-result}
    live/                            live-socket (WS client), live-socket-provider, use-auction-live, live.reducers/types/api, components/live-indicator
    notifications/                   api, use-notifications, components/{notification-bell,notification-item}
  hooks/                             use-client-state, use-is-mobile, use-is-narrow-content, use-resend-cooldown
  lib/                               paged (paginated envelope decoding), api-client, query-client, pwa, push, razorpay, assets, device-info, utils, zod
  providers/                         Providers (Query + theme + tooltip + toaster), AuthBootstrap, LiveSocketProvider (features/live)
  store/auth-store.ts                zustand auth store
  proxy.ts                           edge route gate (nb_at / nb_rt cookies, role gating)
public/                              sw.js, avatar-default.png  (icons/splash generated later)
scripts/                             gen-version, generate-icons, generate-apple-splash, generate-notification-icons
docs/, readme/                       guides (methods, theming, ui); flows/bidding.md, flows/websocket.md
```
