# React Query Hooks

All server-state access goes through `@tanstack/react-query` hooks. By convention each feature owns a `src/features/<feature>/use-<feature>.ts` file that wraps the matching `<feature>.api.ts` calls in `useQuery` / `useInfiniteQuery` / `useMutation`. Components do not call `*.api.ts` functions directly. Known exceptions: `AuthBootstrap` runs the `['me']` query itself, `<ContactForm>` keeps its one `useMutation(sendContact)` inline, and `<MorePage>` reads `['app-version']` (`fetchAppVersion`, `src/lib/pwa.ts`) inline.

## Purpose

This file is the catalog of every query and mutation hook, its **query key**, what it fetches or changes, and what it invalidates. Query keys are the cache identity. Invalidate by **key prefix**: TanStack Query matches prefixes, so `['auctions']` also invalidates `['auctions', filters]`, `['auctions', 'mine', status]` and `['auctions', 'categories']`.

## QueryClient config (`src/lib/query-client.ts`)

`makeQueryClient()` builds the client; the module exports one shared instance, `queryClient`, which `<Providers>` passes to `QueryClientProvider` and `api-client.ts` clears on a forced logout. Default query options:

| Option | Value | Effect |
|---|---|---|
| `staleTime` | `30_000` (30 s) | data is fresh for 30 s; no refetch within that window |
| `retry` | `1` | one retry on failure before surfacing the error |
| `refetchOnWindowFocus` | `false` | no automatic refetch when the tab regains focus |

Per-hook overrides: `useCategories`, `useWatchlistIds` and the legal hooks use a 5-minute `staleTime`; `useUnreadMessageCount` polls every 60 s and refetches on focus and reconnect; `AuthBootstrap`'s `['me']` retries only unreachable errors and refetches on focus and reconnect (`readme/methods/api-client.md`).

## Shared hooks (`src/hooks/`)

| Hook | File | What it does |
|---|---|---|
| `useHydrated()` | `use-client-state.ts` | `false` during SSR and hydration, `true` after |
| `useInstallAvailable()` | `use-client-state.ts` | live PWA install availability (`src/lib/pwa.ts`) |
| `useClientSnapshot(read, serverValue)` | `use-client-state.ts` | a one-off read of `localStorage` / `sessionStorage` / `isStandalone()` after hydration |
| `useIsNarrowContent()` | `use-is-narrow-content.ts` | `true` when `<main>`'s content box is narrower than 48rem (the `@3xl/content` breakpoint); gates the admin lists' two queries |
| `useIsMobile()` | `use-is-mobile.ts` | viewport `max-width: 767px`; currently has no caller |
| `useResendCooldown(seconds, initial = 0)` | `use-resend-cooldown.ts` | `{ resendIn, start(sec?) }` countdown for "Resend code" in the email OTP steps |

The three `use-client-state.ts` hooks wrap `useSyncExternalStore`. Use them instead of `const [x, setX] = useState(); useEffect(() => setX(read()), [])`, which the React Compiler lint (`react-hooks/set-state-in-effect`, an error) rejects. Callers: `ThemeToggle`, `PwaInstallPrompt`, `MorePage`, `DashboardShell`, `usePushSubscription`.

To reset state when a prop changes, adjust it during render with a `prev…` state (see `AssetImage`, `SearchInput`), not in an effect. To keep a react-hook-form in sync with fetched data, pass it as `values` (see `profile-edit-card.tsx`), not `reset()` in an effect.

Other hooks outside `src/features/*/use-*.ts`:

- `useServerNow()` (`src/components/common/countdown.tsx`): current time on the server's clock, from one shared 1 s interval plus the live store's `serverOffsetMs`. `0` until mounted.
- `useUrlState(defaults)` (`src/features/admin/use-url-state.ts`): URL-synced string filters plus `page` / `pageSize` (sizes `ADMIN_PAGE_SIZES = [10, 25, 50]`). Default values are dropped from the URL, and changing any filter resets `page`.
- `usePulseKey(value)` (`src/features/live/use-pulse-key.ts`): a counter that increments when `value` changes, used as a React `key` to replay the bid panel's price animation.
- `useSortState()` / `useSortedItems()` (`src/components/common/use-sortable-data.ts`): client-side table sorting.

## Auth (`features/auth/use-auth.ts`)

Email + password login; email OTP only for signup verification and forgot password. None of these hooks toast; the pages and components handle success and error copy (`authErrorMessage`).

| Hook | Type | Key / target | Behavior |
|---|---|---|---|
| `useLogin()` | mutation | `login` -> `POST /auth/login` `{ email, password, deviceInfo }` | on success `useSignedIn()`: `resetAuthFlags()`, `setMember(member)`, invalidates `['me']`, `router.replace` to `?next=` (non-admins, when safe) or `homeFor(role)`. A `403 EMAIL_NOT_VERIFIED` means the API just emailed a code; the login page switches to `<VerifyEmailStep>` |
| `useSignup()` | mutation | `signup` -> `POST /auth/signup` `{ name, email, password, role }` | `role` is `BIDDER` or `AUCTIONEER`; returns `{ email, resendAfterSec }` |
| `useSignupVerify()` | mutation | `signupVerify` -> `POST /auth/signup/verify` `{ email, code, deviceInfo }` | sets the cookies; on success `useSignedIn()` as for login |
| `useSignupResend()` | mutation | `signupResend` -> `POST /auth/signup/resend` `{ email }` | returns `{ resendAfterSec }` |
| `useForgotPassword()` | mutation | `forgotPassword` -> `POST /auth/password/forgot` `{ email }` | always 200; returns `{ resendAfterSec }` |
| `useResetPassword()` | mutation | `resetPassword` -> `POST /auth/password/reset` `{ email, code, password }` | revokes every session; the user logs in again |
| `useChangePassword()` | mutation | `changePassword` -> `POST /auth/password/change` `{ currentPassword, newPassword }` | no side effects |
| `useLogout()` | mutation | `logout` -> `POST /auth/logout` | on success `useSessionEnded()`: store `clear()`, `queryClient.clear()`, `syncAppBadge(0)`, `router.push('/login')` |
| `useLogoutAll()` | mutation | `logoutAll` -> `POST /auth/logout-all` | same as `useLogout` |
| `useSessions()` | query | `['sessions']` | `GET /auth/sessions`: this account's logged-in devices (`DeviceSession[]`, `<MyDevicesCard>`) |
| `useRevokeSession()` | mutation | `revokeSession(id)` -> `DELETE /auth/sessions/:id` | invalidates `['sessions']` |

## Members (`features/members/use-members.ts`)

| Hook | Type | Key / target | Behavior |
|---|---|---|---|
| `ME_KEY` | key | `['me']` | the signed-in member; `AuthBootstrap` runs this query and mirrors it into the auth store |
| `useMe(enabled = true)` | query | `['me']` | `fetchMe` -> `GET /members/me`; currently no caller (read the store instead) |
| `useUpdateMe()` | mutation | `updateMe` -> `PATCH /members/me` `{ name?, phone?, address?, avatarUrl? }` | merges the returned fields into the store's member, invalidates `['me']`. Used by the Profile edit card and the avatar upload |

## Auctions (`features/auctions/use-auctions.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useAuctionsList(filters, initialPage?)` | infinite query | `['auctions', filters]` | `GET /auctions`, 12 per page, offset or cursor (`nextAuctionPage`). `initialPage` is the server-rendered first page for the same filters and seeds `initialData`. Used by `/auctions` and the seller page |
| `useMyAuctions(status)` | infinite query | `['auctions', 'mine', status]` | `GET /auctions/mine`; `status` is `upcoming \| live \| ended \| cancelled` (`/sell/auctions`) |
| `useCategories()` | query | `['auctions', 'categories']` | `GET /auctions/categories`; `staleTime` 5 min |
| `useAuction(id, initial?)` | query | `['auction', id]` | `GET /auctions/:id` (returns `.auction`). Polls every 10 s while the auction is `LIVE` or `SCHEDULED` **and** the live socket is not `open`; refetches once whenever `connectionSeq` changes. With `initial` (the server-rendered detail) it uses `initialDataUpdatedAt: 0`, so it refetches on mount to pick up viewer-specific fields |
| `useAuctionBoundaryRefetch(auction, refetch)` | effect | none | calls `refetch` once when the start time passes, once at the end time, and once 70 s after the end (the close job runs about a minute late) |
| `useCreateAuction()` | mutation | `createAuction` -> `POST /auctions` | invalidates `['auctions']` |
| `useUpdateAuction(id)` | mutation | `updateAuction(id, partial)` -> `PATCH /auctions/:id` | invalidates `['auctions']` + `['auction', id]` |
| `useDeleteAuction()` | mutation | `deleteAuction(id)` -> `DELETE /auctions/:id` | invalidates `['auctions']` + `['auction', id]` |
| `useRepublishAuction()` | mutation | `republishAuction(id, { startTime, endTime })` -> `POST /auctions/:id/republish` | invalidates `['auctions']` + `['auction', id]` |

`useImageUploader({ initialUrls, max = 8, onChange })` (`use-image-uploader.ts`) is the auction form's multi-image uploader: presign -> XHR PUT with per-file progress, JPG / PNG / WebP (originals up to 25 MB, resized client side to a 2000 px WebP before upload, result max 5 MB), `{ items, addFiles, remove, move, uploading }`. `onChange(urls, uploading)` receives the uploaded URLs in display order (first = cover).

## Uploads (`features/uploads/use-upload.ts`)

| Hook | Type | Target | Behavior |
|---|---|---|---|
| `useUploadImage(folder)` | mutation | `presign` -> `POST /uploads/presign`, then `fetch` PUT to the presigned URL | validates type, resizes (`prepareImage` -> `resizeImage`), presigns with the resized type; resolves with the public URL. `folder` is `'auctions' \| 'avatars' \| 'auction-videos'` (the Profile avatar uses `'avatars'`) |

## Bids (`features/bids/use-bids.ts`)

See `readme/flows/bidding.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `usePlaceBid(auctionId)` | mutation | `placeBid(auctionId, amountPaise)` -> `POST /auctions/:id/bids` | on success: toasts `Bid of ₹… placed`, `recordEngagement('bid')`, writes the returned auction into `['auction', auctionId]`, invalidates `['auction-bids', auctionId]`, `['my-bids']`, `['auctions']`. Errors are left to the bid panel (`bidErrorMessage`) |
| `useAuctionBids(auctionId, enabled = true)` | infinite query | `['auction-bids', auctionId]` | `GET /auctions/:id/bids`, 20 per page, newest first; enable only when the history is opened |
| `useMyBids(tab)` | infinite query | `['my-bids', tab]` | `GET /bids/mine`, 20 per page; `tab` is `winning \| outbid \| won \| lost` |

## Live (`features/live/`)

See `readme/flows/websocket.md`.

- `LiveSocketProvider` keeps one WebSocket per tab. Members connect app-wide with a member ticket (`POST /ws/ticket`); guests connect only while an auction page retains the socket (`POST /ws/guest-ticket`). It writes the socket status and reconnect counter into the live store and handles member events: `bid.outbid` (warning toast with "Bid again", invalidates `['my-bids']`), `auction.won` (success toast, invalidates `['my-bids']`), `notification.new` (invalidates `['notifications']` + `['unread-count']`).
- `useLiveSocket()` returns `{ socket, retainGuest }` from the provider's context, or `null` outside it.
- `useAuctionLive(auctionId)` subscribes to one auction's room while mounted and applies its events to the cache:

| Event | Cache effect |
|---|---|
| `bid.placed` | `['auction', id]` patched with `applyBidPlaced`; the bid is prepended to `['auction-bids', id]` (`prependBidToPages`); `['auctions']` invalidated after a 5 s debounce |
| `auction.extended` | `['auction', id]` patched with `applyExtended`; info toast "Time extended" |
| `auction.ended` | `['auction', id]` patched with `applyEnded`, then `['auction', id]` and `['auctions']` invalidated (winner and contact come from the server) |

## Watchlist (`features/watchlist/use-watchlist.ts`)

See `readme/flows/watchlist.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useWatchlistIds()` | query | `['watchlist-ids']` (`watchlistIdsKey`) | `GET /watchlist/ids` -> `{ ids, activeCount }`; members only, `staleTime` 5 min. One request shared by every heart |
| `useWatchlistActiveCount()` | derived | `['watchlist-ids']` | `activeCount` (watched auctions still live or upcoming) for the nav badge |
| `useIsWatching(auctionId)` | derived | `['watchlist-ids']` | `ids.includes(auctionId)` |
| `useWatchlist()` | infinite query | `['watchlist']` (`watchlistKey`) | `GET /watchlist`, 12 per page (`/watchlist`) |
| `useToggleWatch()` | mutation | `{ auctionId, watching }` -> `POST` or `DELETE /watchlist/:auctionId` | **optimistic**: patches `['watchlist-ids']` in `onMutate`, rolls back and toasts `apiErrorMessage(e, 'Could not update your watchlist')` on error; `recordEngagement('watch')` when adding; on settle invalidates `['watchlist-ids']`, `['watchlist']`, `['auction', auctionId]` |

## Commissions and payments (`features/commissions/`)

See `readme/flows/payments.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useCommissions(status)` | infinite query | `['commissions', status]` | `GET /commissions/mine`, 20 per page; `status` is `due \| paid \| waived \| all` |
| `useCommissionSummary(enabled = true)` | query | `['commissions', 'summary']` (`COMMISSION_SUMMARY_KEY`) | `GET /commissions/summary` |
| `usePayCommission(confirmStub)` | hook | `pay(id)` / `payingId` | `POST /commissions/:id/checkout`, then Razorpay Checkout (or, when `keyId === 'stub'`, the page's `confirmStub()` dialog with stub values), then `verifyPayment` (`POST /payments/verify`, 20 s timeout). While Checkout is open it polls `GET /commissions/:id` every 4 s (and on focus / visibility) for up to 20 min, so a webhook-settled payment closes Checkout. On success toasts and invalidates `['commissions']` + `['me']`. If Razorpay took the money but verify failed, it checks the commission once, then toasts "Payment received — confirming…" and refreshes again after 5 s and 15 s. `pay()` resolves `true` once paid |

`features/payments/payments.api.ts` has no hook file: `verifyPayment` is a plain function used by `usePayCommission`.

## Notifications (`features/notifications/use-notifications.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useUnreadCount` | query | `['unread-count']` | alias of `useUnreadMessageCount` (see Push) |
| `useLatestNotifications(enabled)` | query | `['notifications', 'latest']` | `GET /notifications?page=1&pageSize=10` for the header bell dropdown; members only, `staleTime: 0`; enable only while open |
| `useNotificationList()` | infinite query | `['notifications', 'list']` | `GET /notifications`, 20 per page (`/notifications`) |
| `useMarkRead()` | mutation | `markNotificationRead(id)` -> `POST /notifications/:id/read` | invalidates `['notifications']` + `['unread-count']` |
| `useMarkAllRead()` | mutation | `markAllNotificationsRead()` -> `POST /notifications/read-all` | same invalidation |

## Push and app-icon badge (`features/push/use-push.ts`)

See `readme/flows/push-notifications.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useUnreadMessageCount()` | query | `['unread-count']` (`unreadCountKey`) | `GET /notifications/unread-count` -> the member's unread **notification** total. Members only; polls every 60 s while visible, refetches on focus and reconnect, `staleTime` 15 s. The one definition of this query |
| `useAppBadge()` | query | `['unread-count']` | the same query, plus: listens for the service worker's `NOTIFICATION_COUNT` message (`setQueryData` + invalidates `['notifications']`) and paints the count with `syncAppBadge()` whenever it changes. Mounted by `<NotificationBell>` |
| `usePushSubscription()` | queries + actions | `['push', 'vapid']`, `['push', 'subscription']` (both `staleTime: Infinity`) | returns `{ state: 'unsupported' \| 'blocked' \| 'off' \| 'on', blockedReason, busy, enable, disable, configured }`. The subscription query re-posts the browser's existing subscription (`POST /push/subscribe`, idempotent), which re-attaches it to the new login session after every sign-in. `onPermissionChange()` re-renders and invalidates it. `enable()` subscribes, saves and sets the query to `true`; `disable()` unsubscribes, `POST /push/unsubscribe`, sets it to `false` and clears the badge. Answers are withheld until hydrated. Used by `<PushPermissionPrompt>` and the More page's switch, so the two never disagree |

## Legal pages (`features/legal/use-legal.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useLegalPage(slug)` | query | `['legal-page', slug]` | `GET /settings/legal/:slug`; `staleTime` 5 min |
| `useLegalPages()` | query | `['legal-pages']` | `GET /settings/legal`; same `staleTime` |

Neither currently has a caller: `/pages/[slug]` is server-rendered with `getLegalDocServer()` (`features/settings/settings.server.ts`). The admin editor uses its own `useLegalPage` from `use-admin.ts` (below).

## Admin (`features/admin/use-admin.ts`)

SUPER_ADMIN only. Keys come from `adminKeys` (`all: ['admin']`, `dashboard`, `settings`, `legal(slug)`). Mutations do not toast; the pages do.

| Hook | Type | Query key | Behavior / invalidates |
|---|---|---|---|
| `useAdminDashboard()` | query | `['admin', 'dashboard']` | `GET /admin/dashboard` |
| `useAdminList(resource, filters, page, pageSize, fetcher)` | query + infinite query | `['admin', resource, 'list', filters, page, pageSize]` / `['admin', resource, 'infinite', filters]` | dual pagination (below). Returns `{ desktop, mobile, mobileItems, error, refetch }` for `<AdminList>` |
| `useAdminMembers(f, page, size)` | list | `resource = 'members'` | `GET /admin/members` |
| `useAdminAuctions(f, page, size)` | list | `resource = 'auctions'` | `GET /admin/auctions` (`status`, `q`) |
| `useAdminCommissions(f, page, size)` | list | `resource = 'commissions'` | `GET /admin/commissions` (`status`) |
| `useAdminPayments(f, page, size)` | list | `resource = 'payments'` | `GET /admin/payments` (`status`) |
| `useUpdateMember()` | mutation | `PATCH /admin/members/:id` `{ isActive?, role? }` | `['admin']` |
| `useCancelAdminAuction()` | mutation | `DELETE /auctions/:id` | `['admin']` + `['auctions']` |
| `useWaiveCommission()` | mutation | `POST /admin/commissions/:id/waive` | `['admin']` + `['commissions']` |
| `useAdminSettings()` | query | `['admin', 'settings']` | `GET /admin/settings` |
| `useSaveSettings()` | mutation | `PUT /admin/settings` | writes the saved settings into `['admin', 'settings']`, invalidates `['auctions', 'categories']` |
| `useLegalPage(slug)` | query | `['admin', 'legal', slug]` | `GET /settings/legal/:slug` |
| `useSaveLegal(slug)` | mutation | `PUT /admin/settings/legal/:slug` `{ title, content }` | writes the result into `['admin', 'legal', slug]` |

### Responsive dual pagination

Admin lists render a **table + offset `ListPagination` when the content area is wide** and **cards + infinite scroll when it is narrow** (`<ResponsiveList>`, `docs/PAGINATION.md`). The layout switch is pure CSS (`hidden @3xl/content:block` / `@3xl/content:hidden`), but the two layouts fetch differently, so `useAdminList` runs both queries and gates them with `useIsNarrowContent()`: the offset `useQuery` (`placeholderData: keepPreviousData`) is enabled when wide, the `useInfiniteQuery` (`MOBILE_PAGE_SIZE = 100` per batch, `nextPagedParam`) when narrow. Exactly one fetches. The hook measures `<main>`'s content box, not the window, so toggling the sidebar swaps the running query along with the layout. Reference wiring: `src/app/(admin)/admin/members/page.tsx`.

Member-facing lists (auctions, my bids, watchlist, notifications, commissions) are infinite-scroll only.

## Notes

- **Query keys are the contract.** When a mutation changes data another hook reads, invalidate that hook's key prefix. Cross-feature invalidation is intentional: a bid refreshes `['auctions']` and `['my-bids']`, paying a commission refreshes `['me']` (for `unpaidCommissionPaise`), saving admin settings refreshes `['auctions', 'categories']`. Invalidating `['auctions']` also marks `['auctions', 'categories']` stale, since it shares the prefix.
- **`['me']`** is `AuthBootstrap`'s query (`readme/methods/stores.md`), which syncs into the zustand auth store whenever it refetches.
- **Filters belong in the key** (`['auctions', filters]`, `['my-bids', tab]`, `['commissions', status]`) so each filter is its own cache entry.
- **Toasts mostly live in the calling component** (`mutate(values, { onSuccess, onError })`), using the feature error maps (`authErrorMessage`, `auctionErrorMessage`, `bidErrorMessage`, `commissionErrorMessage`). Exceptions that toast inside the hook: `usePlaceBid` (success, because the cache update unmounts the bid controls before a component callback would run), `useToggleWatch` (error), `usePayCommission`, `usePushSubscription`, and the live socket handlers.

### Reference files

- `src/lib/query-client.ts`, `src/lib/paged.ts`, `src/lib/pagination.ts`
- `src/hooks/*.ts`
- `src/features/*/use-*.ts`, `src/features/live/live-socket-provider.tsx`
- `src/features/*/*.api.ts`

*Last updated: 2026-11-15 (rewritten against the current code: auth, members, auctions, uploads, bids, live, watchlist, commissions, notifications, push, legal and admin hooks with their real query keys)*

## Packages added for listing quality
- `yet-another-react-lightbox`: the detail gallery's zoomable lightbox (`auction-gallery.tsx`). `papaparse` (+ `@types/papaparse`): CSV template and parsing for `/sell/bulk` (`features/bulk/bulk.csv.ts`).
- Hooks: `useVideoUpload(onDone)` (`features/uploads/use-video-upload.ts`, presign to `auction-videos` + XHR progress), `useBulkCreate()` / `useBulkImageUpload()` (`features/bulk/use-bulk.ts`), `useSimilarSold(id)` (`['auction-similar-sold', id]`, `features/auctions/use-auctions.ts`).
