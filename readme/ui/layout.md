# Layout system

How pages assemble. The app uses **Next.js 15 App Router route groups** — each group owns a `layout.tsx` that wraps its pages in the right chrome (and, for private areas, the `AuthGuard`).

## Route groups & their layouts

| Group | File | Chrome | Guard |
|---|---|---|---|
| `(member)` | `src/app/(member)/layout.tsx` | `DashboardShell` (member nav) | `AuthGuard allow={['MEMBER']}` + `BusinessGuard` (popup only, `/search`/`/listings`/`/inquiries` — never blocks rendering) |
| `(admin)` | `src/app/(admin)/layout.tsx` | `DashboardShell` (admin nav) | `AuthGuard allow={['SUPER_ADMIN']}` |
| `(auth)` | `src/app/(auth)/layout.tsx` | split-screen brand panel + centered form panel | none (public) |
| _(no group)_ | `src/app/pages/layout.tsx` | sticky brand header only — admin-managed content pages (`/pages/[slug]`) | none (public; `/pages/*` is absent from every `proxy.ts` route table, so logged-out signup links work) |

### Route-segment loading fallbacks

`src/app/(member)/loading.tsx` and `src/app/(admin)/loading.tsx` — Next's `loading.tsx`
convention, rendered instantly while a page's own chunk or data is still resolving (a dynamic
route not yet compiled in dev, a slow cold-started API call). Both are the shared `.app-loader`
spinner (`globals.css`) centered in a `min-h-[50vh]` box. Without them that window renders
**nothing**, which is what actually paints as a white screen between navigations — the
`AuthGuard` spinner only covers the *session* check, not the segment load. `(auth)` and
`/pages/*` are static and public, so neither needs one.

### Segment-level layouts (nested within a route group)

A route group's own `layout.tsx` (the table above) is not the only kind in this app — a route
**segment** inside a group can have its own `layout.tsx` too, for chrome that belongs to just that
subtree. The first (and so far only) one: `src/app/(member)/chat/layout.tsx` — see
`readme/flows/messaging.md`. It wraps `/chat` and `/chat/[id]` in a WhatsApp-Web-style split pane
(persistent sidebar + a right pane showing whichever child page matched), so the sidebar
(`chat/conversation-list.tsx`) survives navigation between threads instead of remounting. It nests
*inside* `(member)/layout.tsx`'s `DashboardShell` — same `AuthGuard`/`BusinessGuard`/nav chrome as
every other member page, this layer only adds the two-pane split within `<main>` — a split on `@3xl/content`, i.e. 768px of *content*, so the sidebar toggle alone can open or close it (see Container queries below). Follow this same
pattern (a segment `layout.tsx` under the relevant route folder) the next time a section needs
chrome that spans multiple sibling routes under it but shouldn't leak to the rest of its route
group.

Marketing/landing (`/`, `/about`, `/how-it-works`, `/products`, `/contact`, `PublicNavbar`/`PublicFooter`) has moved to the separate `the marketing site` repo (root domain; this app is mounted on its own subdomain). `src/app/page.tsx` here is now a bare `redirect('/login')` fallback — see below.

The **root** layout (`src/app/layout.tsx`) wraps everything: it loads the `Inter` font (`--font-inter`), sets metadata, applies `font-sans` on `<body>`, and mounts `<Providers>` (theme + react-query + toaster — see `readme/theming/dark-mode.md`). `suppressHydrationWarning` on `<html>` lets `next-themes` set the class without a hydration error. Both `<html>` and `<body>` also carry `overflow-x-hidden` — a defensive backstop against mobile horizontal-scroll regressions (e.g. a CSS Grid item with no `min-w-0` letting an unbreakable long string, like a business's `companyName`, widen its track past the viewport). The real fix is always at the source (see the `min-w-0` note under Member/Admin pages below and the `Tabs` entry in `readme/ui/components.md`) — this is a safety net, not a substitute.

## DashboardShell — the authenticated shell

`src/components/layout/dashboard-shell.tsx`. The single shell for both member and admin areas; the only difference between them is the `nav: NavItem[]` array passed in.

```ts
export interface NavItem { href: string; label: string; icon: LucideIcon; pinMobile?: boolean; hideMobile?: boolean; pinBottomDesktop?: boolean; requiresFeature?: string; badge?: number; }
// mobile-bottom-nav.tsx — the bottom bar's fixed 4th tab
export interface MoreTab { href: string; label: string; icon: LucideIcon; }
export function DashboardShell({
  nav,
  moreTab,
  children,
}: {
  nav: NavItem[];
  moreTab: MoreTab;   // required (2026-10-22; was an optional `moreHref` string defaulting to '/more')
  children: React.ReactNode;
})
```

Each role declares its `MoreTab` next to its nav array: `memberMoreTab` in `src/app/(member)/nav.ts`
(`{ href: '/profile', label: 'Profile', icon: UserRound }`) and `adminMoreTab` in
`src/app/(admin)/nav.ts` (`{ href: '/admin/profile', label: 'Profile', icon: UserRound }` — was `/admin/more` "More" until 2026-10-30). `DashboardShell`
just forwards it to `<MobileBottomNav>`.

Structure:

- **Desktop sidebar** — `sticky top-0 h-screen md:h-dvh w-64` (the shell's outer wrapper is `h-screen md:h-dvh` too: on iPad `100vh` is the toolbars-collapsed height, and since only `<main>` scrolls the toolbars never collapse, so the sidebar footer (Logout) sat under the browser chrome), `bg-card border-r`, hidden below `md`. Collapsible via the topbar `Menu` toggle: the `aside` animates its width (`md:w-64 md:border-r` ↔ `md:w-0 md:border-r-0`) with `transition-[width] duration-300 ease-in-out`, `overflow-hidden` clipping a fixed `w-64` inner content wrapper so the nav doesn't reflow mid-animation. The `collapsed` state persists across reloads in `localStorage` under the `sidebar-collapsed` key (`'1'`/`'0'`), restored in a post-mount `useEffect` to avoid an SSR hydration mismatch. The width transition is gated behind an `animate` flag enabled one frame after restore, so the saved state appears instantly on load and only later user toggles animate. Brand header (`h-16`, `NobleBid` `text-gradient` logo) + scrollable primary nav + a single **bordered bottom group** (`border-t p-3`, always rendered): any `pinBottomDesktop` items followed by a ghost **Logout** button (same `space-y-1` list, so Logout sits flush under them with no extra divider — only the one `border-t` above the whole group) that opens the shared destructive `<ConfirmDialog>`. `renderNavLink()` is the shared link renderer for the `pinBottomDesktop` items — nav split is `nav.filter(item => !item.pinBottomDesktop)` / `.filter(item => item.pinBottomDesktop)`, computed inside `DashboardShell` (desktop-only: `SidebarBody` only renders inside the `hidden md:block` `<aside>`, so this flag has zero effect on the mobile bottom nav / 4th-tab page — those still consume the full flat `nav` array via `pinMobile`/`hideMobile`). `adminNav` (`src/app/(admin)/nav.ts`) flags `Breach Incidents` and `Settings` this way, and `memberNav` flags `Profile` (2026-10-22), so on desktop they sit directly above Logout instead of at the bottom of the scrollable primary list; mobile ordering (bottom bar + 4th-tab page) is unaffected.
- **Mobile bottom nav** (`src/components/layout/mobile-bottom-nav.tsx`) — replaces the old slide-in drawer entirely. **It never zooms, because it is outside the only zoomable surface.** Browser page pinch-zoom magnifies the whole layout viewport, fixed elements (this bar and the chat FAB) included, and nothing can be exempted — counter-scaling them from `visualViewport` events reaches JS a frame after the compositor has already zoomed, so they stutter. Native page zoom is therefore **off** (viewport `maximumScale: 1, userScalable: false` in `src/app/layout.tsx`; `touch-action: pan-x pan-y` on `html`/`body` in `globals.css`; and `<BlockNativePinch>` cancelling iOS Safari's `gesturestart`/`gesturechange`, since Safari ignores `user-scalable=no`). Zoom is **moved, not removed**: `<PinchZoom>` (`src/components/layout/pinch-zoom.tsx`) wraps the page content inside `<main>` and handles two-finger pinch itself, 1×–3×. During the gesture it applies a compositor `transform: scale()` about the pinch point (no layout, so it tracks the fingers); on release it commits to CSS `zoom`, so the content reflows and `<main>` pans it natively in both axes, with the scroll position set so the point under the fingers does not move through the swap. Styles are written straight to the DOM rather than through React state, and zoom resets on navigation. The header, bottom nav and chat FAB are siblings of `<main>`, so none of them is ever scaled. Two consequences: pages outside `DashboardShell` (login/signup, `/pages/*`) have no `<PinchZoom>` and are no longer pinch-zoomable; and browser page zoom (Ctrl + / −, trackpad pinch on desktop) is unaffected, as a text-size setting should be. A `fixed inset-x-0 bottom-0 z-40 md:hidden` bar, `h-20` (a 64px tab row + a fixed 16px `pb-4` gap that clears the iOS home indicator / Android gesture bar — not `env(safe-area-inset-bottom)`, which is 0 without `viewport-fit=cover`), solid `bg-background` with no `backdrop-blur`, showing up to `MAX_BOTTOM_ITEMS` (3) items as tabs, plus a fixed 4th tab described by the `moreTab` prop (`MoreTab { href, label, icon }`): **"Profile"** (`UserRound`) for both roles — `/profile` for members, `/admin/profile` for admins (admin's was "More", `/admin/more`, until 2026-10-30). The 4th tab always renders, even when there are no overflow items, because its page also hosts theme/install/update/logout, which must stay reachable on mobile. It reads as active on its own `href` and on any overflow route (e.g. `/businesses` lights up Profile for a member). Which items land in the bar is decided by `getBottomNavItems(nav)`: if any items are flagged `pinMobile: true`, those (in array order, capped at 3) win the bar regardless of their desktop sidebar position; otherwise it falls back to the first 3 items positionally. `getOverflowNavItems(nav)` returns everything else, minus any item flagged `hideMobile: true` (items that shouldn't appear on mobile at all, not even on the 4th tab's page — the member's own Profile item uses this, since on mobile Profile *is* the 4th tab) — `more-page.tsx` calls this same helper so the bottom bar and the 4th tab's page can never disagree about which items overflow. Both helpers plus `isNavActive()` (longest-prefix matcher) are exported from this file. `<main>` gets `pb-36 md:pb-16` so page content never sits under this bar **or** the chat FAB (see the `<main>` entry below for the full arithmetic). Desktop and mobile now have genuinely separate nav surfaces — the desktop `aside` and the mobile bottom bar are two different components, both driven by the one `nav` array each layout passes in (no per-viewport nav array needed — "Nav is data" convention still holds, just consumed by two renderers, with `pinMobile` as the one per-item hint for mobile ordering).
- **Profile page, both roles** (`src/components/layout/more-page.tsx`, `<MorePage nav title description tabs>`) — the full-page counterpart to the bottom bar's 4th tab, modeled on the sibling `pcplastic_app` project's `MorePage`/`DynamicBottomNav` pattern and, since 2026-10-30, laid out like `unikorncoatings_app`'s profile page: one tab strip, one card per tab. Routes: `src/app/(member)/profile/page.tsx` (member, `/profile`, 2026-10-22 — replaced the deleted `(member)/more/page.tsx`) passes Account, Plan and Businesses tabs (see "Member Profile page" below); `src/app/(admin)/admin/profile/page.tsx` (admin, `/admin/profile`, 2026-10-30 — replaced `(admin)/admin/more/page.tsx`, and `next.config.ts` redirects `/admin/more` there) passes an Account tab alone. Each route page passes that group's `nav` array (hoisted to `src/app/(member)/nav.ts` / `src/app/(admin)/nav.ts` so the layout and the page import the exact same array — no duplicated nav definitions). Both are linked on desktop from the sidebar's bottom group (a `Profile` item, `hideMobile` + `pinBottomDesktop`, in each nav array). Content, top to bottom:
  - Title and description (both required).
  - A `grid-cols-3` tap grid of `getOverflowNavItems(nav)` (the same overflow the bottom bar hides), at the top of the **first** tab (under the strip, above the Account card) and `md:hidden` — it stands in for the bottom bar, and from `md` the sidebar lists every one of these items (a chrome decision, so a viewport breakpoint) — each cell a `Card hover` wrapping a `Link`, icon + label, active cell tinted `border-primary/40 bg-primary/5`.
  - The tab strip and its content. `tabs: ProfileTab[]` (`{ value, label, icon, content }`, exported from `more-page.tsx`) comes from the page (both roles pass just Account); `MorePage` appends two shared tabs: **Devices** — only when the account's own device cap `AuthMember.deviceLimit` (from `GET /members/me`, `memberLimit` or `superAdminLimit` for its role) is above 1, rendering `<MyDevicesCard limit>` (`src/components/common/my-devices-card.tsx`); with a cap of 1 there is never another device to sign out, so the tab is not shown — and **App** (below — named App, not Settings, because a super admin's sidebar already has the platform-wide Settings page). `?tab=<value>` picks the opening tab, a starting value only (switching tabs does not rewrite the URL); the active tab is derived during render, so an unknown value, or `devices` for an account without that tab, opens the first tab. `useSearchParams()` sits behind a `<Suspense>` inside `MorePage`. On a phone the strip is `w-full` with even, text-only `flex-1` triggers (`px-2`) so every tab fits one row; from `@lg/content` it is `w-fit` at the left edge with icons, like `/admin/settings`. Radix unmounts an inactive tab's content.
  - **App** tab (`value: 'app'`; was "Settings" until 2026-10-30) — one "App settings" card holding a bordered `divide-y` list of rows (`SettingRow`: icon chip, title, state line, and the row's action on the right — under it, full width, below `@lg/content`; a row passing `inline` (the Message notifications switch) keeps its control on the right at every width, since a lone switch under the text read as detached from its row):
    - **Theme** — not the topbar's icon-only `<ThemeToggle>`: shows "Light mode"/"Dark mode" and a "Use dark mode"/"Use light mode" button calling `next-themes`' `setTheme`.
    - **Install App** — uses the same `src/lib/pwa.ts` helpers as `<PwaInstallPrompt>` (`isInstallAvailable`, `isStandalone`, `isIos`, `onInstallAvailabilityChange`, `promptInstall`); iOS (no native `beforeinstallprompt`) gets a step-by-step `<Dialog>` instead of a native prompt. This is a second, page-level entry point to installing — the global bottom banner (`readme/flows/pwa.md`) still exists independently.
    - **Legal** — one link row per entry in `LEGAL_PAGES` (`src/constants/legal.ts`), each to `legalPagePath(slug)` (`/pages/privacy-policy`, `/pages/terms-conditions`) with an icon from a slug→icon map (`ShieldCheck` / `FileText`, defaulting to `FileText`) and a trailing `ChevronRight`. Driven off the catalogue, not hardcoded, so a page added to `LEGAL_PAGES` appears here for free. **This is the only in-app entry point to the legal pages** — they're deliberately not `NavItem`s (no sidebar/bottom-bar slot, and they render on their own public chrome outside `DashboardShell`); the other links to them live on `/signup` and `/admin/settings`. Appears on both `/profile` and `/admin/profile`, since both share this component. See `readme/flows/legal-pages.md`.
    - **App version** — a **Clear Cache & Update** button: `useQueryClient().clear()` then `applyUpdateAndReload()` (same helper `<PwaUpdatePrompt>` uses) — clears the react-query cache and all SW caches, then hard-reloads. Row copy: "Clears cached data and reloads the latest version." (was "Clears saved data on this device…" until 2026-11-04 — an overclaim). It deliberately keeps localStorage (`theme`, `sidebar-collapsed`, `noblebid-push-asked:app`), sessionStorage, the push subscription and the `nb_at`/`nb_rt`/`dvid` cookies: those are preferences, the session and the device id, not stale data — clearing `dvid` would count the phone as a new device against the device cap. In-memory Zustand stores reset on the reload anyway.
    - **Log out** — a **Logout** button with the same `<ConfirmDialog>` + `useLogout().mutateAsync()` pattern as the desktop sidebar footer Logout (a second, page-level entry point to logging out; both call the exact same hook).
  `MorePage` itself has no identity card; both roles pass `<ProfileIdentityCard>` (`src/components/common/profile-identity-card.tsx`) as their Account tab.
- **Topbar** — `sticky top-0 z-30 h-[72px] pt-2 md:h-16 md:pt-0`, solid `bg-background` (no `backdrop-blur`: `<main>` is the scroll container, so nothing passes under the header, and on iOS WebKit a backdrop-filter layer re-rasterises its children and left the logo soft). Left: a mobile-only `NobleBid` `text-gradient` logo link (`md:hidden` — desktop already shows the logo in the sidebar brand header, so it'd be redundant there) + a desktop-only `Menu` toggle (`hidden md:inline-flex`, toggles the `collapsed` state to hide/show the desktop sidebar — no mobile hamburger anymore, since the mobile drawer is gone) + an identity label, visible at every width — **"Super Admin"** when `member.role === 'SUPER_ADMIN'`; otherwise `member.name || member.mobile` (`max-w-[10rem] truncate` — falls back to mobile digits when the member hasn't set a name). Right: `<ThemeToggle />` (wrapped `hidden md:block` — mobile theme switching moved to the Profile/More page's Theme card, see above) + a **desktop-only avatar link to the Profile page** (`hidden md:block`, `public/avatar-default.png`, `next/image` `fill` with `alt=""` inside a `h-12 w-12 rounded-full overflow-hidden` `<Link>`, `object-cover`) — `href={moreTab.href}`, so `/profile` for a member and `/admin/profile` for an admin (2026-11-03; it was a static, unclickable image). Accessible name **"Open profile"** (`aria-label`, `title="Profile"`), deliberately not "Profile": the sidebar's own Profile link is matched by exact name (`admin.spec.ts`). Focus ring like `Button`, `hover:opacity-85`. No dropdown, same image for every member; on a phone the bottom bar's Profile tab does this job. The wrapper uses a hardcoded `bg-black dark:bg-white` (inverted, not `bg-background`/other theme token) — an intentional exception to the "semantic classes only" rule (hard rule 7): black backdrop in light mode, white in dark mode, so the PNG's transparent/light background always has contrast against it. (The member `/wallet` balance chip that used to sit here was removed along with the wallet/points feature — see `readme/flows/plans.md` for the plan-subscription model that replaced it.)
- **`<main>`** — `@container/content flex-1 overflow-y-auto px-4 pb-36 pt-4 sm:px-6 sm:pt-6 md:px-6 md:pb-16 md:pt-6`. **`@container/content` is the surface every page body queries** (2026-10-23, see Container queries below); the padding classes stay viewport-based because they are chrome clearance, and a query measures the content box anyway, so they are already subtracted from what pages see. Content wrapped in `<PageTransition key={pathname}>` so the enter animation re-runs on every navigation.

  The bottom padding is load-bearing and **must not be folded into a `p-*` shorthand**. Two fixed elements overlay the bottom of the viewport: the mobile bottom nav (`h-20`, `md:hidden`) and the chat FAB (`common/chat-widget.tsx`, 48px tall, at `bottom-[calc(6rem+env(safe-area-inset-bottom))]` on mobile → covers 96–144px, at `bottom-4` on desktop → covers 16–64px; its open panel sits at `10rem` on mobile). `pb-36` (144px) clears both on mobile; `pb-16` (64px) is exactly the FAB's desktop reach — enough that the last row sits immediately above the button, without leaving a band of dead space under it. Sides and top are therefore set per-axis (`px-*`/`pt-*`), never as `p-*`.

  This was a live bug: the class list ended in `md:p-6`, and that shorthand reset the bottom padding to 24px at `md`+ — less than the FAB's 64px reach — so the last row of every desktop page sat underneath the chat button. It showed up most obviously on `/search`, where the last row *is* the pagination bar and the final page number plus the Next arrow were unreachable.

The desktop sidebar and the mobile drawer are gone as separate concepts — desktop renders `SidebarBody` inside the `aside`, mobile renders `<MobileBottomNav>` (a different component, no shared JSX). **Active nav state** is computed by the single shared `isNavActive(pathname, href)` (`mobile-bottom-nav.tsx`) — `DashboardShell`'s desktop sidebar, `MobileBottomNav`, and `more-page.tsx` all call this one function (no duplicated matching logic):

```ts
const EXACT_MATCH_HREFS = new Set(['/admin', '/listings']);
export function isNavActive(pathname: string, href: string) {
  if (EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}
```

`EXACT_MATCH_HREFS` holds any nav href that is a literal path-prefix of a *different* nav item's route — `/admin` so the admin Dashboard link doesn't stay lit on every `/admin/*` sub-route, and `/listings` so the "My Listings" nav item doesn't also light up while on `/listings/new`, which is the separate "Create Listing" nav item (see below). Add a href here whenever a new nav item's route is a prefix of another route it needs to stay distinct from. The active link gets `bg-primary/10 text-primary` plus a left accent bar (`absolute left-0 h-5 w-1 bg-primary`); inactive links are `text-muted-foreground hover:bg-accent`.

### Member nav (`(member)/layout.tsx`)

`memberNav` (`src/app/(member)/nav.ts`, reworked 2026-10-22), in array order — which is also the desktop sidebar order:

| # | Label | Route | Icon | Flags |
|---|---|---|---|---|
| 1 | **Create Listing** | `/listings/new` | `SquarePlus` | `pinMobile` |
| 2 | **Search** | `/search` | `Search` | `pinMobile` (was labelled "Search Products") |
| 3 | **Inquiries** | `/inquiries` | `ClipboardList` | `pinMobile` — see `readme/flows/inquiries.md` |
| 4 | **Businesses** | `/businesses` | `Building2` | — |
| 5 | **My Listings** | `/listings` | `List` | — (was "Listings", `hideMobile`) |
| 6 | **Watchlist** | `/watchlist` | `Bookmark` | `requiresFeature: FEATURE_KEYS.WATCHLIST` |
| 7 | **Chat** | `/chat` | `MessageSquare` | `requiresFeature: FEATURE_KEYS.MEMBER_CHAT` |
| 8 | **Profile** | `/profile` | `UserRound` | `hideMobile`, `pinBottomDesktop` |

On desktop, items 1–7 fill the scrollable sidebar and Profile sits in the bottom group directly above Logout. **Plans** has no nav item (since 2026-09-12): `/plans` is reached only from the "Upgrade Your Plan" prompts (the Profile page's Plan tab, its other entry point, was removed on 2026-10-30) on `/search`, `/listings/new` and an inquiry's "View buyer details". There is no member dashboard page — `/businesses` is the role-home a `MEMBER` lands on after login.

**Live counts on nav items (2026-11-03).** `NavItem.badge?: number` is attached at runtime, never written in a nav array: `useMemberNav()` sets the **Chat** item's to the member's unread DM total (`useUnreadMessageCount()`, the same `['unread-count']` cache entry as the installed app's icon badge — `readme/flows/push-notifications.md`; live via the member area's socket, refetched on focus). Rendered with `<CountBadge>` (nothing at 0, "99+" cap): right-aligned in the desktop sidebar link (`renderNavLink`), on the icon's corner for a bottom-bar tab, and in the top-right corner of a Profile quick-link cell. Chat is an overflow item on a phone, so the **Profile** (4th) tab shows a dot whenever any overflow item has a count. Chat is filtered out without `MEMBER_CHAT`, so a member on a plan without it sees no count in the nav (the icon badge still counts).

**Mobile bottom bar:** Create Listing · Search · Inquiries (the three `pinMobile` items, in array order) · **Profile** (`memberMoreTab`, the 4th tab). Everything else that isn't `hideMobile` — Businesses, My Listings, and, when the plan allows, Watchlist and Chat — lands in the Profile page's quick-link grid. Profile itself is `hideMobile` so it doesn't also appear in its own grid.

**Create Listing is not gated in the nav.** The item always links to `/listings/new`, which handles a member with no approved business (an inline "Business Required" empty state) or a plan without `SALE_LISTING` (an "Upgrade Your Plan" empty state) itself — see `readme/flows/listings.md`. `DashboardShell` still does not fetch `useMyBusinesses` for nav purposes.

**`requiresFeature`-gated items are filtered out entirely, not shown-locked.** `memberNav` itself has no entitlement awareness — `useMemberNav()` (also in `nav.ts`) reads `member.features` and drops any item whose `requiresFeature` key isn't present before returning the array, and every consumer of `memberNav` (`(member)/layout.tsx`, `(member)/profile/page.tsx` — which hand the already-filtered array down as the `nav` prop) calls this hook instead of importing the static array directly, so desktop sidebar, mobile bottom bar, and the Profile page can never disagree about what a given member can see. `DashboardShell`/`MobileBottomNav`/`MorePage` themselves stay unaware of `requiresFeature` — they just render whatever `nav` they're handed. See `readme/flows/watchlist.md`.

- **Wallet, Transactions, Leads Unlocked** were all **removed** along with the wallet/points feature (`/wallet`, `/transactions`, `/unlocked`) — there is no replacement nav item; plan subscriptions are the app's only purchase flow now (see `readme/flows/plans.md`, `readme/flows/leads.md`).
- **Team** was **removed entirely** along with `SubMember` — every Member is just a Member (no primary/sub distinction). Selling under multiple identities is "Businesses" (`/businesses`, `Building2` icon) — a Member can own several Businesses, see `readme/flows/business.md`.
- **`/more`** (the member's old overflow page) was deleted on 2026-10-22; `/profile` replaces it, and `next.config.ts` permanently redirects `/more` → `/profile` so old links and installed-PWA bookmarks still work (`readme/flows/middleware.md`).

**Live DM connection, app-wide (2026-11-03).** `(member)/layout.tsx` also mounts `<MessagingLive>` (`src/features/messaging/messaging-live.tsx`) inside `<AuthGuard>`, outside `<BusinessGuard>`: the member area's one WebSocket (`useChatSocket`, moved here from `chat/layout.tsx`) plus `useAppBadge()`, so the installed app's icon badge — total unread DMs — stays current on every member page. Renders nothing. Beside it, `<PushPermissionPrompt>` (2026-11-04, moved from `chat/layout.tsx`) — the one-time "turn on notifications" toast, once per surface, on any member page. See `readme/flows/push-notifications.md` and `readme/flows/websocket.md`.

### Member Profile page (`/profile`)

`src/app/(member)/profile/page.tsx`, added 2026-10-22. This reverses the earlier removal of `/profile`. It is the member's 4th bottom-bar tab and the desktop sidebar's bottom-group item. It renders `<MorePage nav={useMemberNav()} title="Profile" description="Your account, devices and app settings." tabs={…}>` with one tab, **Account** (`UserRound`), to which `MorePage` adds **Devices** (device limit above 1) and **App** — the same tab set as `/admin/profile`. The Plan and Businesses tabs (`ProfilePlanCard`, `ProfileBusinessesCard`) were removed on 2026-10-30: plan and businesses have their own pages, `/plans` and `/businesses`.

- **`ProfileIdentityCard`** (`src/components/common/profile-identity-card.tsx`, the Account tab of both roles) — a plain card like `unikorncoatings_app`'s Account card (2026-10-30; replaced a brand-band hero card with a large avatar): "Account" title + description with an **Edit** button (`aria-label="Edit name"`) in the header, then a label/value `<dl>` (`@lg/content:grid-cols-2`) — Name ("Not set" when empty), Mobile, Email, and "Member since" (`AuthMember.createdAt`, present only after `GET /members/me`; the row is left out without it). Only the name is editable. **Edit** opens a dialog with a react-hook-form + zod form (`profileNameSchema`, `src/features/members/profile.schema.ts`); the form lives inside `DialogContent`, so it remounts and re-seeds from the store each time the dialog opens. Saving calls `useUpdateMyName()` → `PATCH /members/me`, which patches the auth store's `member.name` and invalidates `['member-me']` (`readme/flows/auth.md`).

### Admin nav (`(admin)/layout.tsx`)

Dashboard · Members · Businesses · Listings · Products · Specifications · Quantities · Inquiries · Watchlists · Member Chats · Subscriptions · Plans · Features · Breach Incidents · Settings · Profile (icons: `LayoutDashboard`, `Users`, `Building2`, `List`, `Boxes`, `SlidersHorizontal`, `Hash`, `ClipboardList`, `Bookmark`, `MessageSquare`, `BadgeCheck`, `Layers`, `ListChecks`, `ShieldAlert`, `Settings`, `UserRound`), hoisted to `src/app/(admin)/nav.ts` as `adminNav`. **Member Chats** (`/admin/messages`) is the SUPER_ADMIN read-only DM oversight view — see `readme/flows/messaging.md`. **Inquiries** (`/admin/inquiries`, 2026-10-22) is the oversight view of members' buy requirements — see `readme/flows/inquiries.md`. `adminNav` has no `pinMobile` items, so on mobile the bottom bar shows the first three positionally — Dashboard · Members · Businesses — plus the **Profile** tab (`adminMoreTab`); the remaining items live in `/admin/profile`'s quick-link grid, see above. Profile itself is `hideMobile` + `pinBottomDesktop` (2026-10-30), so on desktop it sits with Breach Incidents and Settings above Logout. (**Point Packages** and **Wallets** were removed along with the wallet/points feature.)

## How AuthGuard wraps

Both private layouts wrap the shell in `<AuthGuard>`; the `(member)` group also wraps in `<BusinessGuard>`, inside `<AuthGuard>` and outside `<DashboardShell>`:

```tsx
export default function MemberLayout({ children }) {
  return (
    <AuthGuard allow={['MEMBER']}>
      <BusinessGuard>
        <DashboardShell nav={nav} moreTab={memberMoreTab}>{children}</DashboardShell>
      </BusinessGuard>
    </AuthGuard>
  );
}
```

`AuthGuard` (`src/components/common/auth-guard.tsx`) reads `useAuthStore()` (`member`, `initialized`). While `!initialized` (auth still bootstrapping, see `auth-bootstrap`) or the role isn't allowed, it renders a `Skeleton` placeholder — so the shell never flashes for an unauthorized user. On a failed check it `router.replace()`s to `/login` (unauthenticated) or the correct home (`/admin` vs `/businesses`). This is the **only** client-side redirect mechanism — pages must not roll their own (hard rule 5). Server components also gate, but this keeps client-side SPA navigation safe.

### BusinessGuard — a popup, not a redirect, on `/search`/`/listings`/`/inquiries`

`src/components/common/business-guard.tsx`. A Member gets the most out of `BUSINESS_GATED_PREFIXES` (`src/constants/routes.ts` — `/search`, `/listings` and, since 2026-10-22, `/inquiries`, covering `/listings/new` too; posting an inquiry is a dialog on `/inquiries`) only with at least one **`APPROVED`** business (`readme/flows/business.md`) — a `PENDING` (e.g. awaiting admin review on a `MANUAL`-verification registration) or `REJECTED`-only membership does not count. `/businesses`, `/plans`, and `/profile` are unaffected either way. The popup's copy says an approved business is needed to "browse, search, or post listings and inquiries".

**Deliberately does not redirect or block rendering.** `children` always renders — the page underneath is fully visible (search itself returns zero hits server-side without an approved business, `bids-api`'s `readme/flows/search.md`'s "Business-approval gate"; `/listings/new` shows its own inline `<EmptyState>` in this case, see `readme/flows/listings.md`). On top of that, `<BusinessGuard>` calls `useMyBusinesses({ pageSize: 50 }, gated)` — the same params every gated page passes (`/listings`, `/inquiries` and their `/new` forms), so they share one `GET /businesses/mine` (it was `pageSize: 100` until 2026-10-30, a second request on each of those pages) — and, once resolved with no `APPROVED` row, opens a dismissible `<Dialog>` ("Business registration required") with a "Register Business" button (→ `BUSINESS_REGISTER_PATH`) and a "Not now" dismiss. Dismissal is local `useState`, reset on every pathname change — so it reappears on the next visit to a gated route rather than being permanently silenced. Earlier revisions of this component redirected/blocked (see changelog) — that's gone now, on both this component and the edge (`proxy.ts` no longer touches business-approval at all, see `readme/flows/middleware.md`).

This reintroduces a `useMyBusinesses` call at the `(member)` layout level — note this is a **different** purpose than the old nav-gating `useMyBusinesses`/`hasApprovedBusiness` call `DashboardShell` used to make (removed 2026-07-17, see changelog below): that one decided whether to show a "Create Listing" nav item; this one decides whether the popup shows on `/search`/`/listings`/`/inquiries`.

### The proxy also bounces logged-in users off `/`

`src/proxy.ts` (edge, runs before any React renders) already redirected an authenticated visitor away from `/login`/`/signup` — decodes the same httpOnly `nb_at` JWT cookie the backend sets, and if a valid `role` is found on one of `AUTH_ROUTES`, `NextResponse.redirect()`s to that role's home (`/admin` or `/businesses`) before the page ever renders. `AUTH_ROUTES` also includes `"/"` (exact match only, via `startsWithAny`): a logged-in member/admin hitting `/` is redirected server-side to their role home; an unauthenticated hit falls through to `src/app/page.tsx`'s `redirect('/login')`.

## Marketing chrome (moved out)

`PublicNavbar`/`PublicFooter` and all landing/marketing pages (`/`, `/about`, `/how-it-works`, `/products`, `/contact`) were extracted into the separate `the marketing site` repo, served on the root domain while this app lives on its own subdomain. Their Login/Join CTAs there link to `${NEXT_PUBLIC_APP_URL}/login` (absolute, cross-origin) instead of `next/link`. This app no longer ships those components or pages.

## Auth chrome

`(auth)/layout.tsx` is a `lg:grid-cols-2` split: a left brand panel (`bg-gradient-to-br from-primary to-blue-900 text-white`, hidden below `lg`) with the logo + value-prop copy, and a right form panel (`max-w-md`) that renders the page (`/login`, `/register`). On desktop the grid is locked to the viewport (`lg:h-screen lg:overflow-hidden`); the brand panel is fixed (`lg:h-screen`) and **only the form panel scrolls** (`lg:h-screen lg:overflow-y-auto`). The inner wrapper uses `my-auto` so short forms stay vertically centered while a tall form (e.g. multiple addresses) scrolls fully. Below `lg` there is no fixed height — the page scrolls normally. The brand panel is a marketing hero: a full-bleed product photo (`next/image` `fill`, `/products/pp-jumbo-bag.jpg`) under a blue gradient overlay (`from-primary/95 via-primary/85 to-blue-900/95`) for text contrast, plus a faint grid overlay, a "Trusted by industry leaders" pill badge, headline, a brand-line heading styled as a solid amber sticker (`h3` "On our platform, all products are discounted", `bg-warning` with deep brand navy text and a `BadgePercent` icon; positioning, not a promotion, so no figures; same line and look as `the marketing site`'s hero `DiscountTag`), subcopy, a 3-up feature row (`ShieldCheck` / `SearchCheck` / `Lock` from `lucide-react`), and a white "Explore NobleBid Marketplace" CTA linking to `/`. The panel's copy has to fit `100vh` with no scroll, so on short windows it sheds content by height (arbitrary `[@media(max-height:…)]` variants): below `56rem` tall the subcopy is hidden (it repeats the feature row), below `44rem` the feature row too, and vertical padding drops to `py-8`. The panel's `lg:overflow-y-auto` is only a last resort.

Below `lg` the brand panel (and therefore the logo) is hidden, so the form-panel column carries a **mobile brand header**: `sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur lg:hidden`, holding the `text-gradient` `NobleBid` wordmark linked to `/` — same wordmark treatment as the `DashboardShell` mobile topbar. The column itself is `flex flex-col` so the header sits above the `flex-1` centered form area; `my-auto` centering is unchanged.

On `/login` the header wordmark alone read too small on phones, so below `lg` the login view also shows a **big centred logo**: the NobleBid app tile (`/icons/icon-192x192.png`, `h-20 w-20 rounded-2xl shadow-lg lg:hidden`) above a centred "Welcome Back" heading, the same arrangement as `unikorncoatings_app`'s login. From `lg` up the tile is hidden and the heading is left-aligned again, since the brand panel carries the logo. The OTP step and `/signup` are unchanged.

## Theme-toggle placement

`<ThemeToggle>` lives **only in shell chrome**, never per-page:

- **`DashboardShell` topbar** — right side on desktop, next to the avatar (a link to Profile) (the live control for both member and admin areas).

The auth layout and individual pages do **not** mount their own toggle. (The marketing site's own `PublicNavbar` toggle now lives in the separate `the marketing site` repo.) See `readme/theming/dark-mode.md` for the toggle mechanics.

## Container queries — content lays out against the box it was given (2026-10-23)

**Full spec: [`docs/CONTAINER_QUERIES.md`](../../docs/CONTAINER_QUERIES.md). Hard rule 10.** Ported
from `unikorncoatings_app`, which did the same migration on 2026-10-22.

Inside a page body, every responsive rule is a **container** query, not a viewport breakpoint. The
reason is the sidebar: it is **0px collapsed or 256px expanded** on the member's own toggle, so one
window is two different boxes and `md:` could not tell them apart. At a 940px window `md:` was true
whether the page had 892px (collapsed) or 636px (expanded) — which is why the listings filter rows
and the `/chat` split carried hand-worked sidebar arithmetic in their comments.

Two surfaces declare the container, and they share one name so a component behaves the same wherever
it is mounted:

| Surface | File |
|---|---|
| `<main>` — the content area, desktop and mobile alike (one `<main>`, not two branches) | `dashboard-shell.tsx` |
| `DialogContent` — a dialog is portalled **outside** `<main>`, so without its own declaration nothing inside it would match | `ui/dialog.tsx` |

Plus one sub-container under its own name: `/search`'s results column (`@container/results`), whose
width depends on whether the 260px filter panel is showing.

The mapping used: a page body was getting *viewport minus sidebar minus padding*, so `sm:` →
`@lg/content:` (512px), `md:` → `@2xl/content:` (672px), `lg:` → `@3xl/content:` (768px), `xl:` →
`@4xl/content:` (896px). A default dialog is `max-w-lg` with `p-6`, i.e. **~464px of content on any
screen**, so dialog-internal rows (`DialogHeader`, `DialogFooter`, `TabsList` — mounted in both — and
the rows inside the breach/business/listing/seller/watchlist dialogs) use `@sm/content` /
`@md/content` instead.

What stayed on viewport breakpoints, correctly: `useIsMobile()` and everything that picks *which*
chrome to render (sidebar vs bottom bar, `md:hidden` on the bottom nav, the topbar's `md:` swaps),
`DialogContent`'s own `sm:w-full` and callers' `sm:max-w-md` (an overlay IS sized against the window),
the `<main>` padding above, the chat FAB / install prompt (fixed chrome), **`/search`'s result blocks**
(`hidden md:block` / `md:hidden` — a paging split, numbered vs infinite, that must flip with
`useIsMobile()`, which picks the query), and everything outside `DashboardShell`: the `(auth)`
pages, `/pages/*`, and `OtpInput`, which they mount.

**Lists followed on 2026-10-28.** `ResponsiveList` / `MobileSortControl` used to stay `md:`,
because the hook that picks which list query runs (`useIsMobile()`) read the window, and a container
switch would have shown the cards on a desktop whose only running query was the table's. Both moved
together: the CSS switch is `@3xl/content` (768px of content, the same number), and the pages gate
their queries on `useIsNarrowContent()`, which measures `<main>`'s content box with a
`ResizeObserver`. With the sidebar open on a laptop the lists now show cards rather than a table
scrolling sideways; the table needs a ~1,072px window with the sidebar open, ~816px closed.
`/admin/features` moved from viewport `sm:` to `@min-[40rem]/content`. See
`docs/CONTAINER_QUERIES.md` §5.5.

Two consequences worth knowing:

- **`container-type: inline-size` brings `contain: layout`**, so `<main>` is now a containing block
  for positioned descendants and a stacking context. Every `position: fixed` overlay in the app is
  already portalled to `<body>` (Radix `Dialog`/`Select`/`Popover`/`DropdownMenu`/`Tooltip`,
  `ImageLightbox`) or mounted outside `<main>` (chat FAB, offline banner, install prompt); one left
  inside `<main>` would resolve its coordinates against `<main>` and land offset by the sidebar.
- **`window.resize` is no longer enough** for JS that measures layout: collapsing the sidebar resizes
  the content box with the window standing still. Nothing in the app measures on resize today; new
  code that does needs a `ResizeObserver` on the element.

To check a change: fix the window at ~940px and collapse/expand the sidebar without touching the
window — the layout must re-flow on the toggle alone. `e2e/specs/member.spec.ts` does this on
`/listings` on every PR into `dev`.

## Conventions

- **Chrome belongs to the route-group layout**, not to pages. A page renders content only; the surrounding shell/nav/guard come from `layout.tsx`.
- **One `AuthGuard` per private group**, at the layout level — pages never re-guard.
- **Nav is data**: to add a sidebar link, append a `NavItem` to the group's `nav` array (`src/app/(member)/nav.ts` / `src/app/(admin)/nav.ts`); `DashboardShell`, `MobileBottomNav`, and `MorePage` all read from the same array, so one edit updates desktop, the mobile bar, and the 4th tab's page (`/profile` for members, `/admin/profile` for admins) together. The 4th tab itself is data too: change `memberMoreTab` / `adminMoreTab` in the same files.
- **`PageTransition key={pathname}`** drives the per-navigation enter animation — keep `key` on the route so it re-fires.
- **One page-header row, admin and member alike** (2026-10-30). A screen whose title sits beside an action (a button, a search box, a status badge) uses `flex flex-col gap-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between` — stacked until the content area has 512px, one row from there. When the action is a badge, add `items-start` (and `gap-2`) so it keeps its own width instead of stretching (`/businesses/[id]`, `/admin/settings`). Never a bare `flex items-center justify-between`: it has no narrow layout, so with the sidebar open the action squeezes the title — which is what `/listings`, `/inquiries` and `/businesses/[id]` did until they were brought onto this row. Filter rows follow the same shape (`@lg/content`, or `@2xl/content` where a long tab list needs its own line — `/listings`, `/admin/listings`, `/inquiries`). See `docs/CONTAINER_QUERIES.md` §7.
- **Grid items need `min-w-0`**: a `grid`/`flex` container's item defaults to `min-width: auto`, which sizes to its content's min-content width — an unbreakable long string (company name, email, etc.) inside will widen the track past its container even with `truncate` further down the tree, causing a page-wide horizontal scroll on mobile. Add `min-w-0` on the grid container *and* each item wrapper (see `src/app/(member)/businesses/page.tsx`'s card grid) whenever a grid/flex cell renders untrusted-length text.

## Reference files

- `src/app/layout.tsx` — root layout (font, metadata, providers)
- `src/app/(member)/layout.tsx`, `src/app/(admin)/layout.tsx` — guarded shell usage
- `src/app/(member)/nav.ts`, `src/app/(admin)/nav.ts` — the shared `NavItem[]` arrays and each role's `MoreTab` (`memberMoreTab`, `adminMoreTab`)
- `src/app/(member)/profile/page.tsx` — member `/profile`
- `src/app/(admin)/admin/profile/page.tsx` — admin `/admin/profile`
- `src/components/common/profile-identity-card.tsx` — the account card both Profile pages open with
- `src/features/members/profile.schema.ts` — `profileNameSchema` for the Profile name dialog
- `next.config.ts` — `redirects()`: `/more` → `/profile`, `/admin/more` → `/admin/profile` (permanent)
- `src/app/(auth)/layout.tsx` — public chrome
- `src/app/page.tsx` — `/` redirect-to-`/login` fallback (marketing lives in `the marketing site` now)
- `src/components/layout/dashboard-shell.tsx` — the authenticated shell
- `src/components/layout/mobile-bottom-nav.tsx` — mobile bottom tab bar, `MoreTab` type, `getBottomNavItems` / `getOverflowNavItems` / `isNavActive`
- `src/components/layout/more-page.tsx` — the 4th tab's page content (`/profile`, `/admin/profile`)
- `src/components/layout/grievance-notice.tsx` — one-line DPDP Act §13 Grievance Officer disclosure (`GRIEVANCE_OFFICER` in `src/constants/legal.ts`). Not in `DashboardShell` (would repeat on every authenticated page) — rendered once at the bottom of `app/(member)/businesses/page.tsx` (members reliably land there) and in the public content-page footer (`app/pages/layout.tsx`). `the marketing site`'s public `/contact` + sitewide footer is the primary published surface.
- `src/components/common/auth-guard.tsx` — client route guard
- `src/components/common/business-guard.tsx` — client route guard requiring a registered Business, `(member)` group only
- `src/app/(member)/chat/layout.tsx` — the app's first segment-level `layout.tsx` (see above); `src/app/(member)/chat/conversation-list.tsx` — the shell it persists

*Last updated: 2026-11-04 (`(member)/layout.tsx` mounts `<PushPermissionPrompt>` beside `<MessagingLive>`; App version row copy is "Clears cached data…", and what Clear Cache & Update keeps is documented; `SettingRow` `inline` — the Message notifications switch stays on the right of its row on a phone instead of stacking under the text)*
*Previously: 2026-11-03 (the desktop topbar avatar links to the Profile page (`moreTab.href`), named "Open profile")*
*Previously: 2026-11-03 (admin nav reordered: Members · Businesses · Listings · Products · Specifications · Quantities · Inquiries · Watchlists · Member Chats · Subscriptions · Plans · Features; mobile bottom bar unchanged — still the first three, Dashboard · Members · Businesses)*
*Previously: 2026-11-03 (`NavItem.badge` — the Chat item shows the unread DM count (sidebar, Profile grid cell; dot on the mobile Profile tab), attached by `useMemberNav()`)*
*Previously: 2026-11-03 (`(member)/layout.tsx` mounts `<MessagingLive>` — the app-wide DM socket + app-icon badge; Profile App tab gains a Message notifications switch for members)*
*Previously: 2026-11-03 (/inquiries/new page removed — posting an inquiry is a dialog on /inquiries; the old path redirects to /inquiries?post=1)*
*Previously: 2026-10-30 (`<BusinessGuard>` fetches `useMyBusinesses({ pageSize: 50 })`, matching the gated pages, so `GET /businesses/mine` goes out once instead of twice)*
*Previously: 2026-10-30 (admin nav: Inquiries moved up to sit right after Listings)*
*Previously: 2026-10-30 (Profile's Plan and Businesses tabs removed on every width — `ProfilePlanCard`/`ProfileBusinessesCard` deleted, `ProfileTab.hideOnMobile` dropped; both roles' Profile is Account · (Devices) · App)*
*Previously: 2026-10-30 (Profile's Settings tab renamed **App** (`?tab=app`) — a super admin read it as the platform Settings page)*
*Previously: 2026-10-30 (Profile's Plan and Businesses tabs are desktop-only — `ProfileTab.hideOnMobile`, viewport `< md`)*
*Previously: 2026-10-30 (Profile tab strip moved straight under the header; the phone's quick-link grid now opens the first tab instead of sitting above the strip)*
*Previously: 2026-10-30 (Profile Account tab simplified to a plain label/value card — no brand band or large avatar)*
*Previously: 2026-10-30 (Profile page is tabs, like `unikorncoatings_app`'s: `MorePage` takes `tabs` instead of `children` and adds Devices — only when `AuthMember.deviceLimit` is above 1 — and Settings, the old Theme/Install/Legal/Clear Cache/Logout cards now rows of one settings card; `?tab=` opens a tab; the quick-link grid sits above the tabs on a phone; `MyDevicesCard` moved from `/admin/settings` to `common/` for the Devices tab)*
*Previously: 2026-10-30 (Profile page laid out for wide screens: `MorePage` is full width with a two-column grid from `@4xl/content` — children left, settings rail right — instead of a centred `max-w-2xl` column; the quick-link grid is `md:hidden` (the sidebar lists the same items); the Theme row's "Tap to switch" is now "Switch"; the identity card got a brand band + `xl` avatar and moved to `common/` to be shared; admin `/admin/more` renamed `/admin/profile` (redirected), with the identity card, a sidebar Profile item and a "Profile" 4th tab)*
*Previously: 2026-10-30 (Conventions gained the shared page-header row — `flex flex-col gap-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between`, `items-start` for a badge — used by every admin and member list/detail header; `/listings`, `/inquiries` and `/businesses/[id]` were the last bare `flex justify-between` headers)*
*Previously: 2026-10-28 (lists follow the content box: `ResponsiveList`/`MobileSortControl` at `@3xl/content`, query gate `useIsNarrowContent()`; only `/search`'s paging split stays on the viewport — `docs/CONTAINER_QUERIES.md` §5.5)*
*Previously: 2026-10-23 (container queries: `<main>` and `DialogContent` declare `@container/content`, every page body, form, filter row and dialog row uses `@…/content:` variants instead of `sm:`/`md:`/`lg:`, `/chat` splits on `@3xl/content`, `/search` results get `@container/results`; device/chrome rules and the `useIsMobile()`-paired list switch stay viewport — `docs/CONTAINER_QUERIES.md`)*
*Previously: 2026-10-22 (member nav reworked: Create Listing · Search · Inquiries · Businesses · My Listings · Watchlist · Chat · Profile; mobile bottom bar is Create Listing · Search · Inquiries · Profile. `DashboardShell`/`MobileBottomNav` take a required `moreTab: MoreTab` instead of `moreHref`, declared per role as `memberMoreTab` / `adminMoreTab`. `MorePage` gained `title`, `description` and `children`. New member Profile page (`/profile`: identity card with name edit, plan card, businesses card, then the `MorePage` content) replaces `/more`, which now redirects to `/profile` — this reverses the earlier "`/profile` removed" note. `BusinessGuard` also covers `/inquiries`. Admin nav gained Inquiries; corrected the admin nav list and its mobile tabs (Dashboard · Members · Businesses · More).)*
*Previously: 2026-09-24 (login page: big centred NobleBid app tile above a centred heading below `lg`, like `unikorncoatings_app`.)*

*Previously: 2026-09-24 (ported from `unikorncoatings_app`: mobile bottom nav `h-16` + `env(safe-area-inset-bottom)` → `h-20` with a fixed `pb-4` gap and no blur; chat FAB moved from `5rem` to `6rem` (panel `9rem` → `10rem`) to sit above the taller bar; `<main>` `pb-32` → `pb-36`; topbar solid `bg-background`, no `backdrop-blur`, `h-[72px] pt-2` on mobile; shell + sidebar `md:h-dvh` for iPad.)*

*Previously: 2026-09-23 (native page zoom off; content zooms inside `<main>` via `<PinchZoom>`, so the bottom nav and chat FAB are outside the zoomable surface. New `src/components/layout/pinch-zoom.tsx` (`<PinchZoom>` + `<BlockNativePinch>`), `touch-action` rule in `globals.css`, `viewport` fields in `src/app/layout.tsx`, and `<main>` in `DashboardShell` now carries a ref + `touch-pan-x touch-pan-y`. Also added the missing route-segment loading fallbacks `src/app/(member)/loading.tsx` + `src/app/(admin)/loading.tsx` — the white screen between navigations was an empty segment, not a slow app. All ported from the sibling `unikorncoatings_app`.)*

*Previously: 2026-09-12 (`memberNav` (`src/app/(member)/nav.ts`): Plans nav item commented out, not
deleted — `/plans` route itself untouched, still reachable via direct links (e.g. "Upgrade Your Plan"
EmptyStates); Watchlist switched from `hideMobile` to `pinMobile` to take Plans' old slot, so the mobile
bottom bar still pins 3 tabs — now Search Products · Businesses · Watchlist. Listings stays `hideMobile`,
unchanged)*

*Previously: 2026-09-11 (documented `chat/layout.tsx` — the app's first segment-level `layout.tsx`,
nested inside `(member)/layout.tsx` for the WhatsApp-style split-pane chat redesign; see
`readme/flows/messaging.md`)*

*Previously: 2026-09-11 (added the member `Chat` nav item (`requiresFeature: FEATURE_KEYS.MEMBER_CHAT`, not `hideMobile`) and the admin `Member Chats` nav item — see `readme/flows/messaging.md`)*

*Previously: 2026-09-03 (`NavItem` gained `requiresFeature?: string`; new `useMemberNav()` (`src/app/(member)/nav.ts`) filters `memberNav` by `member.features` before every consumer renders it, so a `requiresFeature`-flagged item — the new Watchlist entry — is dropped entirely rather than shown locked; see `readme/flows/watchlist.md`)*

*Previously: 2026-09-02 (`<BusinessGuard>` no longer redirects or blocks rendering at all — it now always renders `children` and overlays a dismissible popup on `/search`/`/listings` instead; `proxy.ts` dropped its business-approval redirect entirely, see `readme/flows/middleware.md`)*

*Previously: 2026-09-02 (`<BusinessGuard>` scaled back to gate only `/search` + `/listings` (`BUSINESS_GATED_PREFIXES`) instead of every `(member)` page — `/businesses`, `/plans`, `/more` are reachable regardless of approval status now, matching `proxy.ts`)*

*Previously: 2026-09-02 (`<BusinessGuard>` now requires an `APPROVED` business specifically, not just any row — `PENDING`/`REJECTED`-only no longer counts, matching the new edge-level check in `proxy.ts`; fetches `pageSize: 100` instead of `1` to actually see every row's status; redirect target/exempt path renamed to the shared `BUSINESS_REGISTER_PATH` constant)*

*Previously: 2026-09-02 (added `<BusinessGuard>` — every Member must register/join a Business before reaching any `(member)` page; redirects to `/businesses/new`, the one exempt path, until `GET /businesses/mine` returns at least one row, status-agnostic; see `readme/flows/business.md`)*

*Previously: 2026-07-31 (`<main>`'s trailing `md:p-6` shorthand was resetting the bottom padding to 24px on desktop, putting every page's last row — most visibly `/search`'s pagination bar — under the fixed chat FAB; padding is now per-axis with `pb-32 md:pb-16`, sized to clear both the FAB and the mobile bottom nav)*

*Previously: 2026-07-31 (`<MorePage>` gained a **Legal** card linking `/pages/privacy-policy` + `/pages/terms-conditions` off `LEGAL_PAGES` — previously the legal pages had no in-app entry point at all for a logged-in user, only `/signup` and `/admin/settings`; shows on both `/more` and `/admin/more`)*
*Previously: 2026-07-30 (landing/marketing split into a separate `the marketing site` repo — removed `(marketing)` route group, `PublicNavbar`/`PublicFooter`, and `catalog-images.server.ts`; `src/app/page.tsx` is now a bare `redirect('/login')`)*

*Previously: 2026-07-24 (wallet/points removed — dropped the topbar's `/wallet` balance chip (`useBalance`, `formatPoints`, the balance-sync effect) and the member nav's Wallet/Transactions/Leads Unlocked items; admin nav lost Point Packages and Wallets)*

*Previously: 2026-07-17 (fixed PublicNavbar Login button being hidden below sm/640px on real phones — now visible at every width; removed the now-redundant copy from the mobile dropdown; removed the desktop-only "Create Listing" sidebar nav item and DashboardShell's dead useMyBusinesses/hasApprovedBusiness gate that only served it — /listings/new stays reachable via its 3 page-level entry points)*
