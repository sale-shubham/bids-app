# PROJECT_STRUCTURE.md — bids-app

```
src/
  app/
    layout.tsx, manifest.ts, globals.css, icon.svg, page.tsx   root shell + Home placeholder
    (auth)/login, (auth)/signup      guest-only auth pages (placeholders until Phase 1)
    (member)/                        any signed-in role: /watchlist, /my-bids, /profile (layout only so far)
    (auctioneer)/                    /sell/* (layout only so far)
    (admin)/                         /admin/* (layout only so far)
    pages/[slug]                     public legal pages (from API)
    suspended/                       deactivated-account page
  components/
    ui/                              shadcn/Radix primitives
    common/                          generic app components (confirm-dialog, form-input, otp-*, pwa-*, ...)
    layout/                          dashboard-shell, mobile-bottom-nav, more-page, pinch-zoom, nav-items
  constants/                         api.ts, routes.ts (route tables), legal.ts, apple-splash-devices.json
  features/                          auth, push, payments, legal, admin  (*.api.ts, *.schema.ts, use-*.ts)
  hooks/                             use-client-state, use-is-mobile, use-is-narrow-content, use-resend-cooldown
  lib/                               api-client, query-client, pwa, push, razorpay, assets, device-info, utils, zod
  providers/                         Providers (Query + theme + tooltip + toaster), AuthBootstrap
  store/auth-store.ts                zustand auth store
  proxy.ts                           edge route gate (nb_at / nb_rt cookies, role gating)
public/                              sw.js, avatar-default.png  (icons/splash generated later)
scripts/                             gen-version, generate-icons, generate-apple-splash, generate-notification-icons
docs/, readme/                       guides (methods, theming, ui); flows/ deferred
```
