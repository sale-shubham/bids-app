# Layout system

How pages assemble. The app uses **Next.js 16 App Router route groups**: each private group owns a `layout.tsx` that wraps its pages in `AuthGuard` + `DashboardShell`. Public pages live in the `(public)` group and render inside the same shell through `PublicShell` (guest mode when logged out). The marketing pages (home, About, How it works, Contact) are not in this app: they live in the separate `bids-website` repo, and `/` is `redirect('/login')`.

## Route groups and their layouts

| Group / folder | Routes | Chrome | Guard |
|---|---|---|---|
| `(member)` | `/watchlist`, `/profile`, `/notifications` | `DashboardShell`; also mounts `<PushPermissionPrompt>` | `AuthGuard allow={['BIDDER', 'AUCTIONEER']}` |
| `(bidder)` | `/my-bids` | `DashboardShell` | `AuthGuard allow={['BIDDER']}` |
| `(auctioneer)` | `/sell/auctions`, `/sell/new`, `/sell/auctions/[id]`, `/sell/auctions/[id]/edit`, `/sell/commissions` | `DashboardShell`, with `<UnpaidCommissionBanner>` above the page | `AuthGuard allow={['AUCTIONEER']}` |
| `(admin)` | `/admin`, `/admin/members`, `/admin/auctions`, `/admin/commissions`, `/admin/payments`, `/admin/settings`, `/admin/profile` | `DashboardShell`; the sidebar (`ADMIN_NAV`) lists every admin page, so there is no separate sub-navigation | `AuthGuard allow={['SUPER_ADMIN']}` |
| `(auth)` | `/login`, `/signup`, `/forgot-password`, `/reset-password` | header with the wordmark + a centred `max-w-md` column | none (guest-only at the edge) |
| `(public)` | `/auctions`, `/auctions/[id]`, `/leaderboard`, `/sellers/[id]`, `/pages/[slug]` (Terms and Conditions, Privacy Policy, Refund Policy), `/suspended` | `PublicShell` (`(public)/layout.tsx`): `DashboardShell` in guest mode when logged out, the member's own nav when signed in; `<ShellFooter>` after the page | none (public; `/suspended` stays public so a suspended member with cookies is never bounced away) |
| _(root)_ | `/` | `redirect('/login')`; guest-only at the edge (a signed-in visitor lands on their home) | none |

Route classes live in `src/constants/routes.ts` (`AUTH_ROUTES`, `PUBLIC_PREFIXES`, `MEMBER_PREFIXES`, `BIDDER_PREFIXES`, `AUCTIONEER_PREFIX`, `ADMIN_PREFIX`, `homeFor`, `gateFor`, `destinationFor`), shared by `src/proxy.ts`, `AuthBootstrap` and `api-client.ts`.

### Route-segment loading fallbacks

`loading.tsx` in `(member)`, `(bidder)`, `(auctioneer)` and `(admin)`: Next's route-segment fallback, rendered instantly while a page's own chunk or data is still resolving. Each is the shared `.app-loader` spinner (`globals.css`) centred in a `min-h-[50vh]` box. Without one that window renders nothing, which paints as a white screen between navigations; the `AuthGuard` spinner only covers the session check, not the segment load.

### Root layout

`src/app/layout.tsx` loads `Inter` (`--font-inter`), sets metadata (title, Open Graph image, manifest, Apple web-app and startup images, icons) and the viewport (`maximumScale: 1`, `userScalable: false`, `themeColor: '#7C3AED'`), and applies `font-sans` on `<body>`. It renders `<Providers>` (react-query → `next-themes` → `TooltipProvider` → `AuthBootstrap` → `LiveSocketProvider`, plus the `sonner` `Toaster`; see `readme/theming/dark-mode.md`) and, beside it, the app-wide `<OfflineBanner>`, `<ServiceWorkerRegister>`, `<PwaInstallPrompt>` and `<PwaUpdatePrompt>`. `suppressHydrationWarning` on `<html>` lets `next-themes` set the class without a hydration error. Both `<html>` and `<body>` carry `overflow-x-hidden`, a backstop against horizontal page scroll; the real fix is always at the source (see the `min-w-0` convention below).

## DashboardShell — the app shell

`src/components/layout/dashboard-shell.tsx`. The single shell for the four private groups and, in guest mode, the public pages. Private groups pass the role-filtered nav from `useNav()` and `moreTab` from `useMoreTab()`; `PublicShell` passes `GUEST_NAV` and `guestMoreTab(loginHref)` with `guest` when nobody is signed in.

```ts
export interface NavItem { href: string; label: string; icon: LucideIcon; pinMobile?: boolean; hideMobile?: boolean; pinBottomDesktop?: boolean; badge?: number; }
// mobile-bottom-nav.tsx — the bottom bar's fixed 4th tab
export interface MoreTab { href: string; label: string; icon: LucideIcon; }
export function DashboardShell({ nav, moreTab, guest = false, children }: { nav: NavItem[]; moreTab: MoreTab; guest?: boolean; children: React.ReactNode })
```

Structure:

- **Desktop sidebar** — `<aside>` hidden below `md`, `md:w-64 md:border-r` ↔ `md:w-0 md:border-r-0`, toggled by the topbar `Menu` button (`aria-label` "Hide sidebar" / "Show sidebar"). The inner content is a fixed `w-64` column clipped by `overflow-hidden`, so the nav doesn't reflow while the width animates (`transition-[width] duration-300`). The collapsed state persists in `localStorage` under `sidebar-collapsed` (`'1'`/`'0'`), read through `useClientSnapshot` (false during SSR, so no hydration mismatch); the width transition is enabled one frame after mount, so the saved state appears instantly and only later toggles animate. The shell and the sidebar are `h-screen md:h-dvh` (on iPad `100vh` is the toolbars-collapsed height, and only `<main>` scrolls, so the sidebar footer would sit under the browser chrome). Contents: a brand header (`h-16`, `NobleBid` `text-gradient` link to the role's home, or `/auctions` for a guest), the scrollable primary nav (items without `pinBottomDesktop`), and a bordered bottom group (`border-t p-3`): the `pinBottomDesktop` items (Profile) followed by a ghost **Logout** button that opens a destructive `<ConfirmDialog>` ("Log Out"). In `guest` mode the bottom group is not rendered. `renderNavLink()` renders both lists; a link with a `badge` shows a `<CountBadge>` on the right.
- **Topbar** — `h-[72px] pt-2 md:h-16 md:pt-0`, `border-b`, solid `bg-background` (no `backdrop-blur`: `<main>` is the scroll container, so nothing passes under the header, and on iOS WebKit a backdrop-filter layer re-rasterises its children and softens them). Left: a phone-only `NobleBid` wordmark link (`md:hidden`, since the sidebar shows it from `md`), the desktop-only sidebar toggle, and a "Super Admin" label for `SUPER_ADMIN`. Right: `<ThemeToggle>` (`hidden md:block` for a signed-in member, since on a phone theme switching is on the Profile page's App tab; at every width for a guest, who has no Profile), `<NotificationBell>` (renders nothing for guests and `SUPER_ADMIN`) and `<UserMenu>` (avatar dropdown with Profile and Log out, where Profile is `/admin/profile` for `SUPER_ADMIN`; **Log in** / **Sign up** buttons for a guest, carrying `?next=` back to the current page via `useAuthHref()` in `src/hooks/use-login-href.ts`).
- **`<main>`** — `@container/content flex-1 touch-pan-x touch-pan-y overflow-y-auto px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:px-6 md:pb-8 md:pt-6`. **`@container/content` is the surface every page body queries** (see Container queries below). The padding stays viewport-based because it is chrome clearance; a container query measures the content box, so the padding is already subtracted from what pages see. `pb-24` (96px) clears the 80px mobile bottom bar; keep the axes separate (`px-*`/`pt-*`/`pb-*`), since a `p-*` shorthand at a later breakpoint would reset the bottom clearance. Content is wrapped in `<PinchZoom>` and then `<PageTransition key={pathname}>`, so the enter animation re-runs on every navigation.
- **Mobile bottom nav** (`src/components/layout/mobile-bottom-nav.tsx`) — `fixed inset-x-0 bottom-0 z-40 md:hidden`, `h-20` (a 64px tab row + a fixed 16px `pb-4` gap that clears the iOS home indicator / Android gesture bar; not `env(safe-area-inset-bottom)`, which is 0 without `viewport-fit=cover`), solid `bg-background`. It shows up to `MAX_BOTTOM_ITEMS` (3) items plus the fixed 4th tab from `moreTab`: **Profile** (`/profile`, or `/admin/profile` for `SUPER_ADMIN`), or **Log in** for a guest. The 4th tab always renders, because the Profile page also hosts theme, install, update and logout. It reads as active on its own page and on any overflow route. `getBottomNavItems(nav)` takes the `pinMobile` items (in array order, capped at 3) when there are any, else the first 3; `getOverflowNavItems(nav)` returns the rest minus `hideMobile` items, and `MorePage` calls the same helper, so the bar and the Profile grid never disagree. When an overflow item has a `badge`, the 4th tab shows a dot.
- **Pinch zoom** — native page zoom is off: viewport `maximumScale: 1, userScalable: false` (`src/app/layout.tsx`), `touch-action: pan-x pan-y` on `html`/`body` (`globals.css`), and `<BlockNativePinch>` cancelling iOS Safari's `gesturestart`/`gesturechange` (Safari ignores `user-scalable=no`). Otherwise browser zoom would magnify the fixed bottom bar with the page. Zoom is moved, not removed: `<PinchZoom>` (`src/components/layout/pinch-zoom.tsx`) wraps the content inside `<main>` and handles two-finger pinch itself, 1×–3×. During the gesture it applies a `transform: scale()` about the pinch point; on release it commits to CSS `zoom`, so the content reflows and `<main>` pans it natively. Zoom resets on navigation. The header and bottom nav are outside `<main>`, so they never scale. Pages outside `DashboardShell` (the `(auth)` pages) are therefore not pinch-zoomable; keyboard/trackpad browser zoom on desktop is unaffected.

**Active nav state** comes from one shared function, `isNavActive(pathname, href)` in `mobile-bottom-nav.tsx`, used by the sidebar, the bottom bar and `MorePage`:

```ts
const EXACT_MATCH_HREFS = new Set(['/admin']);
export function isNavActive(pathname: string, href: string) {
  if (EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}
```

`EXACT_MATCH_HREFS` holds any nav href that is a path prefix of other routes: `/admin` would otherwise match every admin sub-route. Add a href here when a new nav item's route is a prefix of another item's route. The active link gets `bg-primary/10 text-primary` plus a left accent bar; inactive links are `text-muted-foreground hover:bg-accent`.

### The nav (`src/components/layout/nav-items.ts`)

Three arrays, picked by session in `useNav()` and `PublicShell`. Array order is the desktop sidebar order.

`MEMBER_NAV` (BIDDER / AUCTIONEER):

| # | Label | Route | Icon | Roles | Flags |
|---|---|---|---|---|---|
| 1 | Auctions | `/auctions` | `Gavel` | all | — |
| 2 | Watchlist | `/watchlist` | `Heart` | all | `badge` = active watch count (`useWatchlistActiveCount()`), attached by `useNav()` |
| 3 | My bids | `/my-bids` | `Trophy` | `BIDDER` | — |
| 4 | Sell | `/sell/auctions` | `Store` | `AUCTIONEER` | — |
| 5 | Profile | `/profile` | `User` | all | `pinBottomDesktop`, `hideMobile` |

`ADMIN_NAV` (`SUPER_ADMIN`, who only uses `/admin/*` plus the public pages): Dashboard (`/admin`) · Members · Auctions · Commissions · Payments · Settings · Profile (`/admin/profile`, `pinBottomDesktop`, `hideMobile`).

`GUEST_NAV` (logged-out visitors on the public pages): Auctions · Leaderboard.

The 4th mobile tab comes from `useMoreTab()` (`/profile` for members, `/admin/profile` for `SUPER_ADMIN`) and, for guests, `guestMoreTab(loginHref)` (a **Log in** tab).

- **Desktop:** every item except the `pinBottomDesktop` one fills the scrollable sidebar; Profile sits in the bottom group directly above Logout.
- **Mobile bottom bar:** no item is `pinMobile`, so the bar is the first three items plus the 4th tab. A bidder gets Auctions · Watchlist · My bids and an auctioneer Auctions · Watchlist · Sell, so their Profile grid has no quick links. A super admin gets Dashboard · Members · Auctions, and Commissions · Payments · Settings land in the Profile page's quick-link grid. A guest gets Auctions · Leaderboard plus Log in. Profile itself is `hideMobile`, so it doesn't appear in its own grid.
- Notifications has no nav item: it is reached from the `NotificationBell` dropdown (members only).

### Profile page (`/profile`, `/admin/profile`)

`<ProfilePage>` (`src/components/common/profile-page.tsx`) is shared by `src/app/(member)/profile/page.tsx` and `src/app/(admin)/admin/profile/page.tsx`. It renders `<MorePage nav={useNav()} title="Profile" tabs={…}>` (`src/components/layout/more-page.tsx`) for every signed-in role. Content, top to bottom:

- Title and description.
- The tab strip. On a phone it is `w-full` with even, text-only triggers so every tab fits one row; from `@lg/content` it is `w-fit` with icons. `?tab=<value>` picks the opening tab (a starting value only; switching does not rewrite the URL; an unknown value opens the first tab). `useSearchParams()` sits behind a `<Suspense>` inside `MorePage`. Radix unmounts an inactive tab's content.
- At the top of the **first** tab, a `grid-cols-3` tap grid of `getOverflowNavItems(nav)`, `md:hidden` (it stands in for the bottom bar; from `md` the sidebar lists the same items). Each cell is a `Card hover` link with icon and label, a `CountBadge` in its corner, and `border-primary/40 bg-primary/5` when active.
- **Account** (`account`): `<ProfileIdentityCard>` (avatar upload, name, role badge, email, role-specific figures) and `<ProfileEditCard>` (name, phone, address).
- **Security** (`security`): `<ChangePasswordCard>`, `<MyDevicesCard limit={member.deviceLimit ?? 1}>`, `<SignOutCard>` (log out here or everywhere).
- **App** (`app`, appended by `MorePage`): one "App settings" card holding a bordered `divide-y` list of rows (`SettingRow`: icon chip, title, state line, and the action on the right, or full width underneath it below `@lg/content`; a row passing `inline` keeps its control on the right at every width):
  - **Theme** — "Light mode"/"Dark mode" and a "Use dark mode"/"Use light mode" button (`next-themes` `setTheme`).
  - **Install App** — the same `src/lib/pwa.ts` helpers as `<PwaInstallPrompt>`; iOS (no `beforeinstallprompt`) gets a step-by-step `<Dialog>` instead. Shows "Installed" in standalone mode.
  - **Notifications** — only for a signed-in member: an `inline` `Switch` bound to `usePushSubscription()` (on → `enable()`, off → `disable()`), disabled with the reason when unsupported, blocked or not configured. See `readme/flows/push-notifications.md`.
  - **Legal** — one link row per `LEGAL_PAGES` entry (`src/constants/legal.ts`: Privacy Policy, Terms and Conditions) to `legalPagePath(slug)`, with an icon from a slug → icon map (`ShieldCheck` / `FileText`).
  - **App version** — version and build from `/version.json`, and a **Clear Cache & Update** button: `queryClient.clear()` then `applyUpdateAndReload()` (activates a waiting service worker, deletes every Cache Storage entry, reloads). It leaves `localStorage` and cookies alone, so theme, sidebar state, prompt flags and the session survive.
  - **Log out** — a **Logout** button behind `<ConfirmDialog>` + `useLogout().mutateAsync()`, the same as the sidebar's Logout.

## How AuthGuard wraps

Each private layout wraps the shell in `<AuthGuard>`:

```tsx
export default function AuctioneerLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  const moreTab = useMoreTab();
  return (
    <AuthGuard allow={['AUCTIONEER']}>
      <DashboardShell nav={nav} moreTab={moreTab}>
        <UnpaidCommissionBanner />
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
```

`AuthGuard` (`src/components/common/auth-guard.tsx`) reads `useAuthStore()` (`member`, `initialized`). Until `initialized` (the session is still bootstrapping in `AuthBootstrap`), or while the role isn't allowed, it renders the full-screen `.app-loader` spinner, so the shell never flashes for an unauthorized user. Then it `router.replace()`s to `/login?next=<path + query>` (signed out) or `homeFor(role)` (wrong role). Pages must not roll their own redirect-to-login logic. The edge gate also runs first on every page load (below); the guard keeps client-side navigation and a mid-session logout safe.

### The edge gate (`src/proxy.ts`)

Runs before any React renders, only for guest-only (including `/`), member, bidder, auctioneer and admin routes (public routes pass straight through). It verifies the httpOnly `nb_at` JWT cookie (refreshing through `nb_rt` when it has expired), then applies the pure decision `gateFor(path, role)` from `src/constants/routes.ts`:

- a signed-in visitor on `/`, `/login`, `/signup`, `/forgot-password` or `/reset-password` is redirected by `destinationFor(role, next)`: to `?next=` (a safe same-origin path) for `BIDDER` / `AUCTIONEER`, else to `homeFor(role)`. `?next=` is ignored for `SUPER_ADMIN`;
- a signed-out visitor on a private route is redirected to `/login?next=<path + query>`;
- `/admin/*` without `SUPER_ADMIN`, `/sell/*` as a `BIDDER`, and `/my-bids` as an `AUCTIONEER` are redirected to `homeFor(role)`;
- `SUPER_ADMIN` on any member route (`/watchlist`, `/profile`, `/notifications`, `/my-bids`, `/sell/*`) is bounced to `/admin`. It only uses `/admin/*` plus the public pages.

`homeFor()` sends `SUPER_ADMIN` to `/admin`, `AUCTIONEER` to `/sell/auctions` and `BIDDER` to `/auctions`.

## Public chrome

`(public)/layout.tsx` renders `<PublicShell>` (`src/components/layout/public-shell.tsx`), so the public pages keep the app's sidebar, topbar and bottom bar instead of their own header. The pages themselves stay server components (data and `generateMetadata` for SEO); only the thin shell wrapper reads the session. Logged out (and while the session check is still running, so the server HTML is the guest one) it renders `DashboardShell` with `GUEST_NAV`, `guestMoreTab(loginHref)` and `guest`. Signed in it renders the member's own nav. In both cases `<ShellFooter>` (`shell-footer.tsx`) follows the page content: links to the website's About, How it works and Contact (absolute anchors from `WEBSITE_LINKS` in `src/constants/website.ts`, a different origin) and to the in-app legal pages.

## Auth chrome

`(auth)/layout.tsx` is a `min-h-screen` column: an `h-16` `border-b` header holding the `text-gradient` `NobleBid` wordmark linked to `/auctions`, then a centred form area (`p-6 sm:p-12`) whose inner `max-w-md` wrapper uses `my-auto`, so short forms stay vertically centred and tall ones scroll with the page. The layout exports `dynamic = 'force-dynamic'`: as static pages Next would mark these routes cacheable for a year, and a CDN could then answer without running `src/proxy.ts`, so a signed-in visitor would never be redirected home.

## Theme-toggle placement

`<ThemeToggle>` lives **only in the `DashboardShell` topbar**, never per page. A signed-in member sees it from `md`; on a phone the Profile page's App tab has the Theme row instead. A guest on a public page has no Profile page, so the toggle shows at every width.

The auth layout has no toggle. See `readme/theming/dark-mode.md` for the mechanics.

## Container queries — content lays out against the box it was given

**Full spec: [`docs/CONTAINER_QUERIES.md`](../../docs/CONTAINER_QUERIES.md).** Inside a page body, responsive rules are **container** queries, not viewport breakpoints. The reason is the sidebar: it is **0px collapsed or 256px expanded** on the member's own toggle, so one window is two different content widths and `md:` cannot tell them apart.

Two surfaces declare the container, under one shared name so a component behaves the same wherever it is mounted:

| Surface | File |
|---|---|
| `<main>`, the content area (desktop and mobile alike) | `dashboard-shell.tsx` |
| `DialogContent`, portalled **outside** `<main>`, so it needs its own declaration | `ui/dialog.tsx` |

Page bodies use the page map (`@lg/content` = 512px, `@3xl/content` = 768px, …); rows inside a default dialog (`DialogHeader`, `DialogFooter`, `TabsList`) use `@sm/content`, because a default dialog hands out ~464px. Viewport breakpoints stay for choosing chrome (sidebar vs bottom bar, the topbar's `md:` swaps), overlay widths (`DialogContent`'s own `sm:w-full`), fixed prompts, `<main>`'s padding, and the `(auth)` pages outside `DashboardShell`.

The admin lists switch table/cards at `@3xl/content` (`ResponsiveList`), and their queries are gated by `useIsNarrowContent()`, which measures `<main>`'s content box with a `ResizeObserver`, so the sidebar toggle swaps the query along with the layout.

Two consequences:

- **`container-type: inline-size` brings `contain: layout`**, so `<main>` is a containing block for positioned descendants and a stacking context. Every `position: fixed` overlay is portalled to `<body>` (Radix `Dialog`/`Select`/`Popover`/`DropdownMenu`/`Tooltip`, `ImageLightbox`) or rendered outside `<main>` (the bottom nav, offline banner, install, update and push prompts). One left inside `<main>` would resolve its coordinates against `<main>` and land offset by the sidebar.
- **`window.resize` is not enough** for JS that measures layout: collapsing the sidebar resizes the content box with the window standing still. Use a `ResizeObserver` on the element, as `useIsNarrowContent()` does.

To check a change: fix the window at ~940px and collapse/expand the sidebar without touching the window; the layout must re-flow on the toggle alone.

## Conventions

- **Chrome belongs to the route-group layout**, not to pages. A private or public page renders content only; the shell, nav and guard come from `layout.tsx`.
- **One `AuthGuard` per private group**, at the layout level; pages never re-guard.
- **Nav is data**: to add a sidebar link, add a `NavItem` (with `roles` if it is role-specific) to `MEMBER_NAV`, `ADMIN_NAV` or `GUEST_NAV` in `src/components/layout/nav-items.ts`. `DashboardShell`, `MobileBottomNav` and `MorePage` all read the same filtered array, so one edit updates the sidebar, the bottom bar and the Profile grid together. Live counts go on `badge` in `useNav()`, never in the array.
- **`PageTransition key={pathname}`** drives the per-navigation enter animation; keep the `key` on the route so it re-fires.
- **One page-header row.** A title beside an action (a button, a search box, a badge) uses `flex flex-col gap-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between`: stacked until the content area has 512px, one row from there. The admin pages get it from the common `PageHeader` (`components/common/page-header.tsx`); `/sell/auctions` writes it inline, and `/sell/auctions/[id]` uses it with `@lg/content:items-start`. Never a bare `flex items-center justify-between`: it has no narrow layout, so with the sidebar open the action squeezes the title. See `docs/CONTAINER_QUERIES.md` §7.
- **Grid and flex items need `min-w-0`** when they render text of untrusted length (names, emails, titles): an item defaults to `min-width: auto`, so an unbreakable string widens the track past its container even with `truncate` further down, and the page scrolls sideways on a phone. Add `min-w-0` on the item wrapper.

## Reference files

- `src/app/layout.tsx` — root layout (font, metadata, viewport, providers, global prompts)
- `src/app/(member)/layout.tsx`, `src/app/(bidder)/layout.tsx`, `src/app/(auctioneer)/layout.tsx`, `src/app/(admin)/layout.tsx` — guarded shell usage
- `src/app/(public)/layout.tsx` — public pages in the shell; `src/app/(auth)/layout.tsx` — auth chrome
- `src/components/layout/nav-items.ts` — `MEMBER_NAV` / `ADMIN_NAV` / `GUEST_NAV`, `useNav()`, `useMoreTab()`, `guestMoreTab()`
- `src/components/layout/dashboard-shell.tsx` — the app shell (with `guest` mode), `NavItem`
- `src/components/layout/mobile-bottom-nav.tsx` — bottom tab bar, `MoreTab`, `getBottomNavItems` / `getOverflowNavItems` / `isNavActive`
- `src/components/layout/more-page.tsx` — the Profile page body and its App tab
- `src/components/common/profile-page.tsx` — `<ProfilePage>`, used by `/profile` and `/admin/profile`
- `src/components/layout/public-shell.tsx`, `shell-footer.tsx` — the public pages' shell wrapper and footer
- `src/hooks/use-login-href.ts` — `useAuthHref()` (`?next=` for Log in / Sign up); `src/constants/website.ts` — website links
- `src/components/layout/user-menu.tsx` — header account menu
- `src/components/layout/pinch-zoom.tsx` — `<PinchZoom>` + `<BlockNativePinch>`
- `src/components/common/auth-guard.tsx` — client route guard
- `src/proxy.ts`, `src/constants/routes.ts` — edge gate, route tables, `gateFor` / `destinationFor`

*Last updated: 2026-11-15 (marketing pages moved to `bids-website`; public pages in the `(public)` group inside `DashboardShell` guest mode; SUPER_ADMIN limited to `/admin/*` plus public pages; `MEMBER_NAV` / `ADMIN_NAV` / `GUEST_NAV`)*
