# PWA

NobleBid is an installable PWA (Android, desktop Chrome/Edge, iOS Home Screen).

## Assets (generated from the logo)
- Source: `public/brand/logo-source.png` (colourful brain mark, transparent, 192x192 - swap in a larger master for crisper large icons).
- `node scripts/generate-icons.cjs` -> `public/icons/icon-{72..512}.png` (white tile), `icon-{192,512}x*-maskable.png` (mark inside the 80% safe zone), Apple touch icons, `public/favicon*.{ico,png}`, `public/logo.png` (transparent; headers and the API's `LOGO_URL` for emails).
- `node scripts/generate-notification-icons.cjs` -> `badge-96x96.png` (white silhouette from the logo's alpha, Android status bar) and `notification-192x192.png` (round).
- `node scripts/generate-apple-splash.mjs` -> `public/splash/*` (device list in `src/constants/apple-splash-devices.json`, links emitted by `src/app/layout.tsx`). Splash background is white, matching the manifest `background_color`.
- `sharp` is a devDependency. Re-run all three after changing the logo.

## Manifest (`src/app/manifest.ts`)
Name "NobleBid - Online Auctions", `start_url: /?source=pwa`, `display: standalone`, theme `#7C3AED` (brand purple token), background white, shortcuts Auctions / Watchlist / My bids / Sell, `categories: ['shopping']`. iOS meta (`apple-mobile-web-app-capable`, status bar, splash links) comes from `metadata.appleWebApp` in the root layout.

## Service worker (`public/sw.js`)
- Registered by `<ServiceWorkerRegister>` (production, or dev with `NEXT_PUBLIC_ENABLE_SW=1`) as `/sw.js?api=<API_ORIGIN>`.
- Caches only content-hashed `/_next/static` and versioned static assets (cache name = `version.json` buildId; old caches dropped on activate). **Navigations are never intercepted** (it would drop the auth proxy's Set-Cookie on redirects); `/version.json`, non-GET and cross-origin requests pass through.
- `skipWaiting` on install, `clients.claim` on activate, `UPDATE_APP` message for the update prompt. `/sw.js` and `/version.json` are served `no-store` (`next.config.ts`).
- Push, badge and `pushsubscriptionchange`: see push-notifications.md.

## UI wiring (all mounted in the root layout)
- `<OfflineBanner>`: top banner while `navigator.onLine` is false.
- `<PwaUpdatePrompt>`: polls `/version.json` (5 min + on focus); a changed `buildId` shows a "Reload" toast -> `applyUpdateAndReload()`. `scripts/gen-version.mjs` rewrites it on every build/dev start.
- `<PwaInstallPrompt>`: bottom banner after the visitor's 2nd visit or first bid (`src/lib/engagement.ts`), only when installable. Android/desktop uses the captured `beforeinstallprompt`; **iOS Safari** (not standalone) gets an "Add to Home Screen" instructions sheet. Dismissal is remembered for 14 days. Hidden when standalone.
- Profile -> App tab: Install App button, Notifications switch, app version (from `version.json`) and "Clear cache & update".

## Caching on deploy
`/sw.js` and `/version.json` must stay `no-store` (set in `next.config.ts`); if a CDN in front overrides this, update detection breaks. See deployment.md.
