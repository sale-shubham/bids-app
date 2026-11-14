# React Query Hooks

All server-state access goes through `@tanstack/react-query` hooks. By convention each feature owns a `src/features/<feature>/use-<feature>.ts` file that wraps the matching `<feature>.api.ts` calls in `useQuery` / `useMutation`. Components never call the `*.api.ts` functions directly.

## Purpose

This file is the catalog of every query/mutation hook, its **query key**, what it fetches/mutates, and what it invalidates. Use it to find the right hook and to keep invalidation correct when adding endpoints. Query keys are the cache identity — invalidate by **key prefix** (react-query does prefix matching, so `['my-listings']` invalidates `['my-listings', 'all']`, `['my-listings', 'PENDING']`, etc.).

## QueryClient config (`src/lib/query-client.ts`)

`makeQueryClient()` builds the client used by `Providers` (instantiated once via `useState(makeQueryClient)` so it is stable across renders). Default query options:

| Option | Value | Effect |
|---|---|---|
| `staleTime` | `30_000` (30s) | data is considered fresh for 30s; no refetch within that window |
| `retry` | `1` | one retry on failure before surfacing the error |
| `refetchOnWindowFocus` | `false` | no automatic refetch when the tab regains focus |

Individual hooks override per call (e.g. `usePlans` / `useProducts` use a 5-minute `staleTime`).

## Responsive dual pagination (`hooks/use-is-narrow-content.ts`)

List pages render a **table + offset `ListPagination` when the content area is wide** and **cards + infinite scroll when it is narrow** (see `docs/PAGINATION.md`). The layout switch is pure CSS (`hidden @3xl/content:block` / `@3xl/content:hidden`), but the two layouts fetch differently, so each feature exposes **two** hooks:

- table: the normal offset `useQuery(..., enabled)` — pass `enabled: !isNarrow`
- cards: an `useInfiniteQuery` variant (`...Infinite`, `pageSize = MOBILE_PAGE_SIZE = 100`) — pass `enabled: isNarrow`

`useIsNarrowContent()` (from `@/hooks/use-is-narrow-content`) returns `true` when `<main>`'s content box is narrower than 48rem (768px) — the same box and width as `@3xl/content`. It measures the element (fractional width minus scrollbar and padding), not the window, and re-measures through a `ResizeObserver` on `<main>` plus a window `resize` listener, so the sidebar toggle swaps the running query as it swaps the layout. Outside the dashboard shell (no `<main>`) it falls back to the old `max-width: 767px` viewport query. It is used **only to gate `enabled`**, never to render markup, so it causes no hydration mismatch. Gating means exactly one query fetches — no double-fetch. The card list flattens pages with `data.pages.flatMap((p) => p.data)` and drives `<InfiniteScroll>` with `hasNextPage` / `isFetchingNextPage` / `fetchNextPage`. Reference wiring: `src/app/(admin)/admin/members/page.tsx`.

`useIsMobile()` (`hooks/use-is-mobile.ts`, viewport `max-width: 767px`) remains for `/search` only, where it picks numbered vs infinite paging for a card grid that looks the same on both sides.

## Client-only values (`hooks/use-client-state.ts`)

`useHydrated()` (false during SSR/hydration, true after), `useInstallAvailable()` (live PWA install availability), `useClientSnapshot(read, serverValue)` (a one-off read of `localStorage`/`sessionStorage`/`isStandalone()` after hydration). All are `useSyncExternalStore` wrappers — use them instead of `const [x, setX] = useState(); useEffect(() => setX(read()), [])`, which the React Compiler lint (`react-hooks/set-state-in-effect`, an **error**) rejects. Used by `ThemeToggle`, `PwaInstallPrompt`, `MorePage` and `DashboardShell`'s sidebar state.

To reset state when a prop changes, adjust it during render with a `prev…` state (see `AssetImage`, `SearchInput`, `BusinessGuard`) — not in an effect. To seed a react-hook-form from fetched data, pass it as `values` (see `business-edit-dialog.tsx`), not `reset()` in an effect.

## Auth (`features/auth/use-auth.ts`)

No password anywhere — mobile/email + OTP only. See `readme/flows/auth.md` for the full login/signup flow.

| Hook | Type | Key / target | Behavior |
|---|---|---|---|
| `useRequestOtp()` | mutation | `authApi.requestOtp` | `{ channel: 'MOBILE'\|'EMAIL', mobile?, email? }` → sends a login OTP; 404s if the identifier has no account |
| `useVerifyOtp()` | mutation | `authApi.verifyOtp` | login only; on success: `setMember(member)` + `router.push` to `/admin` (SUPER_ADMIN) or `/businesses` |
| `useSignupStart()` | mutation | `authApi.signupStart` | `{ name, mobile, email }` → sends OTP to both channels, returns `signupSessionId` |
| `useSignupVerify()` | mutation | `authApi.signupVerify` | `{ signupSessionId, channel, code }` → `PENDING` (no side effect) or `COMPLETE` (`setMember` + role redirect, same as `useVerifyOtp`) |
| `useSignupResend()` | mutation | `authApi.signupResend` | `{ signupSessionId, channel }` → resends one channel's code |
| `useLogout()` | mutation | `authApi.logout` | on success: `clear()` (store) + `queryClient.clear()` (drops all cache) + `syncAppBadge(0)` (the server dropped this session's push subscription too) + `router.push('/login')` |
| `useMySessions()` | query | `['my-sessions']` | `GET /auth/sessions` — this account's own logged-in devices (2026-09-16); works for `SUPER_ADMIN` too, surfaced on admin Settings' "My Devices" tab |
| `useRevokeSession()` | mutation | `authApi.revokeMySession` | `DELETE /auth/sessions/:id` — removes one device; `['my-sessions']` |
| `useUpdateMyName()` | mutation | `authApi.updateMyName` | `PATCH /members/me` `{ name }` — the Profile page's Edit name (2026-10-22). On success patches `member.name` in the auth store, invalidates `['member-me']`, toasts "Name updated"; `onError` toasts `apiErrorMessage(e)` |

## Listings — seller side (`features/listings/use-listings.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useMyListings(status?, page=1, pageSize=10, enabled=true)` | query | `['my-listings', { status, page, pageSize }]` | `fetchMyListings(...)` — seller's own listings, offset-paginated (desktop table) |
| `useMyListingsInfinite(status, enabled)` | infinite query | `['my-listings', 'infinite', { status }]` | mobile infinite scroll, 100/batch (shares `['my-listings']` prefix) |
| `useListingCounts()` | query | `['listing-counts']` | per-status counts for the dashboard tabs |
| `useOwnerListing(id?)` | query | `['listing', id]` | single owned listing; `enabled: !!id` |
| `useListingRules(enabled=true)` | query | `['listing-rules']` | `GET /settings/listing-rules` → `{ minListingValue }` (2026-10-22); `staleTime` 5 min. Feeds `<ListingForm>`'s "Listing value · minimum" hint and both edit paths' minimum-value check; disabled for the form's inquiry variant. Invalidated by admin `useUpdateListingRulesConfig()` |
| `useCreateListing()` | mutation | `mutate({payload, files})` — `createListing(payload)` → `{uploads,...}`, then PUTs each `files[]` to its presigned URL (mirrors `useAddBusinessDocuments`) | invalidates `['my-listings']` + `['listing-counts']` |
| `useUpdateListing(id)` | mutation | `mutate({payload, files})` — same two-step shape; `payload` is `UpdateListingPayload` (`existingImages`/`newImages`), full-field, `PENDING_APPROVAL`/`REJECTED`-only backend-side | invalidates `['my-listings']` + `['listing', id]` |
| `useUpdateListingQuantity(id)` | mutation | `updateListingQuantity(id, quantity)` — the only edit allowed once a listing is `APPROVED`/`PAUSED`, always live, toasts "Quantity updated" | invalidates `['my-listings']` + `['listing', id]` |
| `usePauseListing()` | mutation | `pauseListing` | via `useListingAction`; toast `'Listing paused'` |
| `useResumeListing()` | mutation | `resumeListing` | via `useListingAction`; toast `'Listing resumed'` |
| `useDeleteListing()` | mutation | `deleteListing` — soft delete, S3 untouched | via `useListingAction`; toast `'Listing deleted'` |
| `useHardDeleteListing()` | mutation | `hardDeleteListing` — removes the row + wipes its S3 images | via `useListingAction`; toast `'Listing permanently deleted'` |
| `useSubmitListing()` | mutation | `submitListing` | via `useListingAction`; toast `'Listing submitted for approval'` |

`useListingAction<T>(fn, successMsg)` is a shared factory: every lifecycle mutation invalidates `['my-listings']` + `['listing-counts']`, toasts `successMsg` on success, and `toast.error(apiErrorMessage(e))` on error.

## Inquiries (`features/inquiries/use-inquiries.ts`)

A member's buy requirements, added 2026-10-22. See `readme/flows/inquiries.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useBrowseInquiries(page=1, pageSize=10, search='', enabled=true)` | query | `['inquiries', { page, pageSize, search }]` | other members' `OPEN` inquiries, offset-paginated (desktop table) |
| `useBrowseInquiriesInfinite(search, enabled)` | infinite query | `['inquiries', 'infinite', { search }]` | mobile, `MOBILE_PAGE_SIZE` per batch |
| `useMyInquiries(status?, page=1, pageSize=10, search='', enabled=true)` | query | `['my-inquiries', { status: status ?? 'all', page, pageSize, search }]` | the member's own; response includes `counts`; `staleTime: 0` |
| `useMyInquiriesInfinite(status?, search, enabled)` | infinite query | `['my-inquiries', 'infinite', { status: status ?? 'all', search }]` | mobile; `staleTime: 0` |
| `useInquiry(id?)` | query | `['inquiry', id]` | detail; `enabled: !!id`, `staleTime: 0` |
| `useCreateInquiry()` | mutation | `createInquiry(payload)` → `POST /inquiries` | invalidates `['my-inquiries']` + `['inquiries']` + `['inquiry']`; no toast (the page handles success and error) |
| `useUpdateInquiry(id)` | mutation | `updateInquiry(id, payload)` → `PATCH /inquiries/:id` | same invalidation; no toast |
| `useCloseInquiry()` | mutation | `closeInquiry` | via `useInquiryAction`; toast "Inquiry closed" |
| `useReopenInquiry()` | mutation | `reopenInquiry` | via `useInquiryAction`; toast "Inquiry reopened" |
| `useDeleteInquiry()` | mutation | `deleteInquiry` (soft) | via `useInquiryAction`; toast "Inquiry deleted" |

`useInquiryAction<T>(fn, successMsg)` invalidates the same three key prefixes, toasts `successMsg` on success and `toast.error(apiErrorMessage(e))` on error.

## Admin inquiries (`features/admin-inquiries/use-admin-inquiries.ts`)

SUPER_ADMIN oversight of every member's inquiries — its own feature folder, not part of `use-admin.ts`. See `readme/flows/inquiries.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useAdminInquiries(filters, page=1, pageSize=10, enabled=true)` | query | `['admin-inquiries', { ...filters, page, pageSize }]` | offset (desktop table); `filters` = `status`, `memberId`, `businessId`, `q`, `sortBy`, `sortOrder` |
| `useAdminInquiriesInfinite(filters, enabled)` | infinite query | `['admin-inquiries', 'infinite', filters]` | mobile |
| `ADMIN_INQUIRY_MEMBER_PICKER_KEY` | `RemoteSelect` prefix | `['admin-inquiry-members']`, then `'search', {q, pageSize}` (list) / `'selected', id` (label) - `GET /admin/inquiries/members?q&page&pageSize`, `GET /admin/businesses/members-options/:id`. Inquiry mutations still invalidate the prefix |
| `useAdminCloseInquiry()` | mutation | `closeAdminInquiry` → `POST /admin/inquiries/:id/close` | invalidates `['admin-inquiries']` + `['admin-inquiry-members']`; toast "Inquiry closed" |
| `useAdminDeleteInquiry()` | mutation | `deleteAdminInquiry` → `DELETE /admin/inquiries/:id` | same invalidation; toast "Inquiry deleted" |

## Watchlist (`features/watchlist/use-watchlist.ts`)

Gated behind `FEATURE_KEYS.WATCHLIST` — see `readme/flows/watchlist.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useWatchlistedListingIds()` | query | `['watchlist-listing-ids']` | flat `listingId[]` of every `LINKED` entry — drives the search-page bookmark button's checked state |
| `useMyWatchlist(type?, page=1, pageSize=10, search='', enabled=true)` | query | `['my-watchlist', { type, page, pageSize, search }]` | `fetchMyWatchlist(...)`, offset-paginated (desktop table) |
| `useMyWatchlistInfinite(type?, search, enabled)` | infinite query | `['my-watchlist', 'infinite', { type, search }]` | mobile infinite scroll, 100/batch (shares `['my-watchlist']` prefix) |
| `useAddListingToWatchlist()` | mutation | `addListingToWatchlist(listingId)` — `POST /watchlist {listingId}`, creates a `LINKED` entry (backend snapshots the listing's spec values) | invalidates `['watchlist-listing-ids']` + `['my-watchlist']`; toasts `'Added to watchlist'` |
| `useRemoveListingFromWatchlist()` | mutation | `removeWatchlistEntryByListing(listingId)` — `DELETE /watchlist/listing/:listingId`, un-bookmark by listing id (search-page toggle's second click) | invalidates `['watchlist-listing-ids']` + `['my-watchlist']`; toasts `'Removed from watchlist'` |
| `useCreateWantedEntry()` | mutation | `createWantedEntry(payload)` — `POST /watchlist` with `productId`/`specValues`, creates a `WANTED` entry | invalidates `['my-watchlist']`; toasts `'Added to watchlist'` |
| `useUpdateWatchlistEntry(id)` | mutation | `updateWatchlistEntry(id, payload)` — either entry type, edits only `specValues` | invalidates `['my-watchlist']`; toasts `'Watchlist entry updated'` |
| `useRemoveWatchlistEntry()` | mutation | `removeWatchlistEntry(id)` — remove by the `Watchlist` row's own id (Watchlist page's Remove action) | invalidates `['watchlist-listing-ids']` + `['my-watchlist']`; toasts `'Removed from watchlist'` |
| `useSetWatchlistEntryNotify()` | mutation | `setWatchlistEntryNotify(id, enabled)` — `PATCH /watchlist/:id/notify {enabled}`, mutes/unmutes match alerts for one entry | invalidates `['my-watchlist']`; toasts `'Alerts muted'`/`'Alerts turned on'` |
| `useSetAllWatchlistNotify()` | mutation | `setAllWatchlistNotify(enabled)` — `PATCH /watchlist/notify-all {enabled}`, mutes/unmutes every entry the member owns | invalidates `['my-watchlist']`; toasts `'All alerts muted'`/`'All alerts turned on'` |

All invalidate-on-success only, no optimistic updates, `toast.error(apiErrorMessage(e))` on error — same convention as every hook above.

## Messaging (`features/messaging/use-messaging.ts`)

Member-to-member DM. Sending is gated behind `FEATURE_KEYS.MEMBER_CHAT`; reading an existing thread
is not. See `readme/flows/messaging.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useMyConversations(page=1, pageSize=10, search='', enabled=true)` | query | `['my-conversations', { page, pageSize, search }]` | inbox, offset-paginated (desktop table) |
| `useMyConversationsInfinite(search, enabled)` | infinite query | `['my-conversations', 'infinite', { search }]` | mobile infinite scroll, 100/batch (shares `['my-conversations']` prefix) |
| `useStartConversationByListing()` | mutation | `startConversationByListing(listingId)` — `POST /messages/conversations/by-listing/:listingId`, get-or-create | invalidates `['my-conversations']`; returns the `ConversationDto` (caller `router.push`es to `/chat/[id]`, this hook does not navigate); `onError` toasts `apiErrorMessage(e)` — the 403 upgrade-prompt text comes straight from the backend, nothing hardcoded |
| `useStartConversationByInquiry()` | mutation | `startConversationByInquiry(inquiryId)` — `POST /messages/conversations/by-inquiry/:inquiryId`, get-or-create (2026-10-22) | same as `useStartConversationByListing`: invalidates `['my-conversations']`, returns the `ConversationDto` (now with `contextInquiryId`), `onError` toasts `apiErrorMessage(e)`. Backs "Message Buyer" in `<InquiryDetailDialog>` (`/inquiries`) |
| `useMessages(conversationId?)` | infinite query | `['messages', conversationId]` | the combined thread (each page carries `conversation` + `data` messages; the old `useConversation` / `['conversation', id]` is gone). Cursor pagination, `getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined`. **No `refetchInterval`** — refreshed only by `useChatSocket`'s invalidation (`readme/flows/websocket.md`) or a user action. First page = newest batch, `nextCursor` walks backward — flatten with `[...data.pages].reverse().flatMap((p) => p.data)` for oldest-first display, see `readme/flows/messaging.md` |
| `useSendMessage(conversationId)` | mutation | `sendMessage(conversationId, body)` | appends the returned message into the newest page of `['messages', conversationId]` via `qc.setQueryData` (no refetch); patches `lastMessage`/`lastMessageAt` on that page's `conversation` and every cached `['my-conversations', ...]` list via `qc.setQueriesData`; invalidates `['unread-count']` (sending zeroes my own unread for the thread); `onError` toasts `apiErrorMessage(e)` |
| `useMarkRead(conversationId?)` | mutation | `markConversationRead(conversationId)` — `PATCH /messages/conversations/:id/read` | flips `unread: false`/`unreadCount: 0` on the `['messages', id]` page's `conversation` and every cached `['my-conversations', ...]` list via local cache patch; invalidates `['unread-count']` and calls `closeThreadNotification(id)` (takes the thread's OS notification row down) |

`useChatSocket(enabled)` (`use-chat-socket.ts`) is mounted once for the whole member area by `<MessagingLive>` (`messaging-live.tsx`); on every `dm:*` frame it invalidates `['messages', id]`, `['my-conversations']` and `['unread-count']`.

## Push / app-icon badge (`features/push/use-push.ts`)

New-DM Web Push and the installed app's icon badge (2026-11-03). See `readme/flows/push-notifications.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useUnreadMessageCount()` | query | `['unread-count']` (`unreadCountKey`) | the one definition of that query (members only, focus/reconnect refetch, `staleTime` 15s, no interval). Read by `useAppBadge()` and by `useMemberNav()` for the Chat nav item's count — one cache entry, one request |
| `useAppBadge()` | query | `['unread-count']` (`unreadCountKey`) | `GET /messages/unread-count` → total unread DMs; members only. **No interval** — invalidated by every `dm:*` socket frame, send and mark-read; overrides the app-wide `refetchOnWindowFocus: false` (focus + reconnect refetch, `staleTime` 15s) as the safety net under the socket. Listens for the service worker's `NOTIFICATION_COUNT` message (`setQueryData` + invalidates `['my-conversations']`/`['messages']`). Paints the count with `syncAppBadge()` whenever it changes. Mounted once by `<MessagingLive>` |
| `usePushSubscription()` | queries + actions | `['push', 'vapid']` (`staleTime: Infinity`), `['push', 'subscription']` (`staleTime: Infinity`) | returns `{ state: 'unsupported'\|'blocked'\|'off'\|'on', blockedReason, busy, enable, disable, configured }`. The subscription query's `queryFn` re-posts the browser's existing subscription (`POST /push/subscribe`, idempotent) — re-attaches it to the new login session after every sign-in. `onPermissionChange()` re-renders + invalidates it. `enable()` subscribes (re-subscribing on a rotated VAPID key) and `setQueryData(true)`; `disable()` unsubscribes, `POST /push/unsubscribe`, `setQueryData(false)`, `syncAppBadge(0)`. Answers withheld until hydrated (SSR). Used by `<PushPermissionPrompt>` and the Profile App tab's switch — one cache entry, so they never disagree |

## Admin messaging oversight (`features/admin-messaging/use-admin-messaging.ts`)

SUPER_ADMIN read-only — queries only, no mutations (no admin send/reply endpoint exists). See
`readme/flows/messaging.md`.

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useAdminConversations(page=1, pageSize=10, search='', enabled=true)` | query | `['admin-conversations', { page, pageSize, search }]` | offset (desktop table) — every conversation, both members' identity |
| `useAdminConversationsInfinite(search, enabled)` | infinite query | `['admin-conversations', 'infinite', { search }]` | mobile 100/batch |
| `useAdminConversationMessages(conversationId?)` | infinite query | `['admin-conversation-messages', conversationId]` | same cursor direction/flatten convention as the member side's `useMessages`; no poll (`refetchInterval` unset) — a point-in-time lookup, not a live thread |

## Payments (`features/payments/payments.api.ts`)

Not a feature with its own hook file — `verifySubscriptionPayment`/`fetchSubscriptionCheckoutStatus` are plain functions imported directly by whichever purchase flow's `use-*.ts` needs them (currently just subscriptions). See below.

## Plans & subscription (`features/subscriptions/use-subscriptions.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `usePlans()` | query | `['plans']` | `fetchPlans` → `GET /plans`; `staleTime: 5 * 60_000` |
| `useMySubscription()` | query | `['my-subscription']` | `fetchMySubscription` → `GET /subscriptions/me`; `null` if none active |
| `usePurchasePlan()` | mutation | `mutate({ plan: Plan, isUpgrade: boolean })` | Free plan (`priceInr === 0`) → `POST /subscriptions` directly, no Razorpay. Paid plan → `createSubscriptionCheckout` (first-time) or `createUpgradeCheckout` (`isUpgrade`) → Razorpay Checkout in **subscription mode** → `verifySubscriptionPayment`/`fetchSubscriptionCheckoutStatus` (from `features/payments/payments.api.ts`), with a poll-on-drop fallback. On success invalidates `['my-subscription']`, `['search']` (a search hit's `meta.features`/city/state/unlock all depend on the active plan), `['member-me']`; toast `` `Subscribed to ${plan.name}` ``. See `readme/flows/plans.md`. |
| `useCancelSubscription()` | mutation | `cancelMySubscription` → `POST /subscriptions/cancel` | invalidates `['my-subscription']` + `['search']`; toast `'Subscription cancelled'` |

## Business (`features/business/use-business.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useMyBusinesses(params?, enabled?)` | query | `['my-businesses', params]` | `fetchMyBusinesses` — businesses owned by the caller. `enabled` (default `true`) gates the fetch — e.g. `DashboardShell` passes `isMember` so it never runs for admins |
| `useMyBusiness(id?)` | query | `['my-business', id]` | one owned business, `enabled: !!id` |
| `useRegisterBusiness()` | mutation | `registerBusiness` | on success invalidates `['my-businesses']` |
| `useUpdateBusiness(id)` | mutation | `updateBusiness` | applies live; invalidates `['my-business', id]` + `['my-businesses']`, toasts. `onMutate` reads `qc.getQueryData(['my-business', id])?.status` — if it was `REJECTED`, the success toast reads "Changes saved. Resubmitted for admin review." instead of "Business updated" (backend auto-flips `REJECTED`→`PENDING`, `readme/flows/business.md`) |
| `useAddBusinessDocuments(id)` | mutation | document add | invalidates `['my-business', id]` **+ `['my-businesses']`** (added so the list page's status badge stays in sync after a doc-only upload). Same `onMutate` `wasRejected` snapshot as `useUpdateBusiness`, passed as mutation context — the call site (`businesses/[id]/page.tsx`) picks the resubmission toast off it since this hook itself has no toast |
| `useDeleteBusinessDocument(id)` | mutation | document remove | invalidates `['my-business', id]` only — deleting a document never resubmits a rejected business |
| `useDeleteBusiness()` | mutation | `deleteBusiness(id)` — soft delete only, S3 untouched | invalidates `['my-businesses']`, toasts `'Business deleted'` |

Full flow: `readme/flows/business.md`. `SubMember`/Team no longer exist — see `readme/flows/business.md` for the replacement (one Member, many Businesses).

## Leads (`features/leads/use-leads.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useUnlockListing()` | mutation | `unlockListing` | Wraps `POST /leads/unlock/:listingId` (see `readme/flows/leads.md`). **No current caller** — the search page decides entitlement client-side off `h.unlocked`/`FEATURE_KEYS.VIEW_SUPPLIER_CONTACT` instead of calling this and reacting to a 403. Kept for a future flow that might need an explicit unlock call. |

## Search & public catalog detail (`features/search/use-search.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useSearch(params, enabled=true)` | query | `['search', params]` | `POST /search`; `placeholderData: keepPreviousData` (smooth pagination/filtering); `enabled` flag gates it |
| `useFacets(productId?, filters)` | query | `['facets', productId, filters]` | `POST /search/facets`; `enabled: !!productId` |
| `usePublicListing(id?)` | query | `['public-listing', id]` | `GET /catalog/listings/:id` (includes unlock state); `enabled: !!id`. Used by `SellerDetailDialog` and the `/listings/[id]` page |

The `params`/`filters` objects are part of the key, so changing any filter/sort/cursor produces a new cache entry and refetch.

## Catalog products (`features/catalog/use-catalog.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `PRODUCT_PICKER_KEY` | `RemoteSelect` prefix | `['products', 'picker']` + `'search', {q,pageSize}` / `'selected', id` - `GET /products?q&page&pageSize` (active only), `GET /products/:idOrSlug`. Replaced `useProducts()` (no load-all) |
| `useProductWithSpecs(idOrSlug?)` | query | `['product', idOrSlug]` | `fetchProductWithSpecs` — product + its `SpecDef[]` for `<DynamicSpecField>`; `enabled: !!idOrSlug` |

## Legal / content pages (`features/legal/use-legal.ts`)

| Hook | Type | Query key | Behavior |
|---|---|---|---|
| `useLegalPage(slug)` | query | `['legal-page', slug]` | `fetchLegalPage` — public `GET /settings/pages/:slug`; `staleTime: 5 * 60_000` (legal copy is near-static). Powers `/pages/[slug]` |
| `useLegalPages()` | query | `['legal-pages']` | `fetchLegalPages` — the whole catalogue in one call; same `staleTime` |

Both are unauthenticated reads (signup links to these pages before an account exists). See `readme/flows/legal-pages.md`.

## Admin (`features/admin/use-admin.ts`)

Mutations are grouped into objects (e.g. `useMemberAction()` returns `{ approve, reject, activate, deactivate }`), each a `useMutation`. A local `invalidate()` closure refreshes the related query keys.

| Hook | Type | Query key | Invalidates |
|---|---|---|---|
| `useAdminMembers(status?, page=1, pageSize=10, search?, enabled=true)` | query | `['admin-members', { status, page, pageSize, search }]` | — (desktop offset table; `enabled` gates it off on mobile) |
| `useAdminMembersInfinite(status, enabled, search?)` | infinite query | `['admin-members', 'infinite', { status, search }]` (shares the `['admin-members']` prefix so `useMemberAction` invalidation refreshes it too) | — (mobile cards; 100/batch via `MOBILE_PAGE_SIZE`; `getNextPageParam` advances while `page < totalPages`) |
| `useMemberStats()` | query | `['admin-member-stats']` | — |
| `useMemberAction()` | mutations | approve/reject/activate/deactivate member | `['admin-members']`, `['admin-member-stats']`, `['admin-overview']` |
| `useReviewListings(status?, page=1, pageSize=10, enabled=true)` | query | `['admin-listings', { status, page, pageSize }]` | offset (desktop) — |
| `useReviewListingsInfinite(status, enabled)` | infinite query | `['admin-listings', 'infinite', { status }]` | mobile 100/batch |
| `useAdminListingCounts()` | query | `['admin-listing-counts']` | — |
| `useListingReview()` | mutations | approve / reject listing | `['admin-listings']`, `['admin-listing-counts']`, `['admin-overview']` |
| `useAdminProducts(enabled=true)` | query | `['admin-products']` | full list (selectors) |
| `useAdminProductsPage(page=1, pageSize=10, enabled=true)` | query | `['admin-products', { page, pageSize }]` | offset (desktop table) |
| `useAdminProductsInfinite(enabled)` | infinite query | `['admin-products', 'infinite']` | mobile 100/batch |
| `useProductMutations()` | mutations | create/update/activate/deactivate product | `['admin-products']` |
| `adminSpecPickerKey(excludeIds)` | `RemoteSelect` prefix | `['admin-specs', 'picker', {excludeIds}]` - `GET /admin/specifications?q&status=active&excludeIds&page&pageSize` (always sends `page`). Replaced `useSpecs()`; same shape: `adminQuantityPickerKey` -> `['admin-quantities','picker',...]`, `adminFeaturePickerKey` -> `['admin-features','picker',...]`, `adminPlanPickerKey(status)` -> `['admin-plans','picker',{status}]` |
| `useSpecsPage(page=1, pageSize=10, enabled=true)` | query | `['admin-specs', { page, pageSize }]` | offset (desktop Specs table) |
| `useSpecsPageInfinite(enabled)` | infinite query | `['admin-specs', 'infinite']` | mobile 100/batch |
| `useSpecMutations()` | mutations | create/update/remove/assign/unassign spec | `['admin-specs']` + `['admin-products']` |
| `useAdminFeatures()` | query | `['admin-features']` | — |
| `useFeatureMutations()` | mutations | create/update/remove feature | `['admin-features']` |
| `useAdminPlans()` | query | `['admin-plans']` | — |
| `usePlanMutations()` | mutations | create/update/remove plan | `['admin-plans']` |
| `useAdminSubscriptions(status?, planId?, page=1, pageSize=10, search='', enabled=true)` | query | `['admin-subscriptions', { status, planId, page, pageSize, search }]` | offset (desktop table) — |
| `useAdminSubscriptionsInfinite(status, planId, search, enabled)` | infinite query | `['admin-subscriptions', 'infinite', { status, planId, search }]` | mobile 100/batch |
| `useCancelAdminSubscription()` | mutation | `cancelAdminSubscription(id)` → `POST /admin/subscriptions/:id/cancel` — force-cancel any subscription | `['admin-subscriptions']` |
| `useAdminOverview()` | query | `['admin-overview']` | — |
| `useAuditLogs()` | query | `['audit-logs']` | — |
| `useAdminCatalogImages()` | query | `['admin-catalog-images']` | — |
| `useUpdateCatalogImages()` | mutation | update marketing catalog image override | `['admin-catalog-images']`, `['catalog-images']` |
| `useAdminLegalPages()` | query | `['admin-legal-pages']` | — |
| `useUpdateLegalPages()` | mutation | bulk `PUT /admin/settings/pages` (every legal page in one call) | `['admin-legal-pages']`, `['legal-page']`, `['legal-pages']` |
| `useAdminSignupPlanConfig()` | query | `['admin-signup-plan-config']` | `GET /admin/settings/signup-plan` (`{ planSlug, expiresAt }`) — default signup plan + fixed expiry, `readme/flows/admin.md` |
| `useUpdateSignupPlanConfig()` | mutation | `PUT /admin/settings/signup-plan` | `['admin-signup-plan-config']` (also writes the saved payload straight into that key's cache via `qc.setQueryData` in `onSuccess`, ahead of the invalidate, plus `useAdminSettingsStore.setSignupPlanConfig()` — `readme/methods/stores.md`) |
| `useAdminDeviceLimitConfig()` | query | `['admin-device-limit-config']` | `GET /admin/settings/device-limit` (`{ memberLimit, superAdminLimit }`) — per-role device/session cap, 2026-09-16, `readme/flows/admin.md` |
| `useUpdateDeviceLimitConfig()` | mutation | `PUT /admin/settings/device-limit` | `['admin-device-limit-config']` (writes the saved payload straight into that key's cache via `qc.setQueryData` in `onSuccess`) |
| `useAdminListingRulesConfig()` | query | `['admin-listing-rules-config']` | `GET /admin/settings/listing-rules` (`{ minListingValue }`) — minimum listing value, 2026-10-22, `readme/flows/admin.md` |
| `useUpdateListingRulesConfig()` | mutation | `PUT /admin/settings/listing-rules` | writes the saved value into `['admin-listing-rules-config']` via `qc.setQueryData`, and invalidates the member-side `['listing-rules']` so `<ListingForm>`'s hint picks up the new minimum; toast "Listing rules updated" |
| `useAdminBreachIncidents(status?, severity?, page=1, pageSize=10, search='', enabled=true)` | query | `['admin-breach-incidents', { status, severity, page, pageSize, search }]` | offset (desktop table) — |
| `useAdminBreachIncidentsInfinite(status, severity, search, enabled)` | infinite query | `['admin-breach-incidents', 'infinite', { status, severity, search }]` | mobile 100/batch |
| `useAdminBreachIncident(id?)` | query | `['admin-breach-incident', id]` | single incident detail; `enabled: !!id`, `staleTime: 0` (always fresh on open, same reasoning as `useAdminBusinessDetail`) |
| `useBreachIncidentMutations()` | mutations | create/update/notifyBoard/notifyPrincipals/close incident | `['admin-breach-incidents']` + `['admin-breach-incident', id]` (when `id` known) — see `readme/flows/breach-incidents.md` |
| `useAdminWatchlistEntries(type?, memberId?, page=1, pageSize=10, search='', enabled=true)` | query | `['admin-watchlist-entries', { type, memberId, page, pageSize, search }]` | offset (desktop table) — every member's watchlist entries, `readme/flows/watchlist.md` |
| `useAdminWatchlistEntriesInfinite(type, memberId, search, enabled)` | infinite query | `['admin-watchlist-entries', 'infinite', { type, memberId, search }]` | mobile 100/batch |
| `useAdminWatchlistEntryAlerts(entryId?)` | query | `['admin-watchlist-entry-alerts', entryId]` | alerts one entry contributed to (`GET /admin/watchlist/alerts?entryId=`), capped at 100, no pagination UI; `enabled: !!entryId`, `staleTime: 0` — backs the merged Watchlists row's "N sent" dialog |
| `ADMIN_WATCHLIST_MEMBER_PICKER_KEY` | `RemoteSelect` prefix | `['admin-watchlist-members']` + `'search'`/`'selected'` - `GET /admin/watchlist/members?q&page&pageSize`. Other admin pickers: `ADMIN_MEMBER_PICKER_KEY` (`['admin-business-member-options']`, `GET /admin/businesses/members-options`) and `ADMIN_LISTING_BUSINESS_PICKER_KEY` (`['admin-listing-business-options']`, `GET /admin/listings/business-options`). Business side: `myBusinessPickerKey(filters)` -> `['my-businesses','picker',filters]` and `useApprovedBusinessSummary()` -> `[...,'summary']` (listing form: total + sole business for auto-select) |

Each admin mutation toasts on success (e.g. `'Member approved'`, `'Listing rejected'`, `'Specification created'`) and `toast.error(apiErrorMessage(e))` on error. A few low-stakes mutations (`product activate/deactivate`, `spec unassign`) use a bare `onSuccess: invalidate` with no toast.

## Notes

- **Query keys are the contract.** When you add an endpoint that changes data another hook reads, invalidate that hook's **key prefix** in `onSuccess`. Cross-feature invalidation is intentional here (e.g. unlocking a lead and purchasing a plan both invalidate `['search']` and `['member-me']`).
- **`'member-me'`** appears as an invalidation target (leads/subscriptions, and `useUpdateMyName`) even though no query is keyed to it in these files — it's `AuthBootstrap`'s `useQuery(['member-me'], fetchMe)` (`readme/methods/stores.md`), which syncs into the zustand auth store on refetch. Invalidating it refreshes `member.features` after a plan purchase/cancel.
- **List endpoints are cursor-paginated** (`meta.nextCursor`). Pass `status`/`search`/`type` as part of the query key so each filter is its own cache entry. See `docs/PAGINATION.md`.
- **Mutations own their toasts and invalidation** so calling components just `mutate(...)` (optionally with a component-level `onError` for a custom fallback message, e.g. login/register pages).

### Reference files

- `src/lib/query-client.ts`
- `src/features/*/use-*.ts`
- `src/features/*/*.api.ts`

*Last updated: 2026-11-03 (`useUnreadMessageCount()` — shared by the app-icon badge and the Chat nav item's count)*
*Previously: 2026-11-03 (new Push / app-icon badge section (`useAppBadge`, `usePushSubscription`); messaging rows brought up to date — `useConversation` and `useMessages`' polling were long gone; send/mark-read invalidate `['unread-count']`; `useLogout` clears the badge)*
*Previously: 2026-11-03 (`useStartConversationByInquiry` row: "Message Buyer" now lives in `<InquiryDetailDialog>`, the `/inquiries/[id]` page was removed)*
*Previously: 2026-10-28 (the responsive dual-pagination section is now `hooks/use-is-narrow-content.ts` — `useIsNarrowContent()` measures `<main>`'s content box; `useIsMobile()` remains for `/search` only)*
*Previously: 2026-10-22 (added the Inquiries (`features/inquiries/`) and Admin inquiries (`features/admin-inquiries/`) sections; `useUpdateMyName()` to Auth; `useListingRules()` (`['listing-rules']`) to Listings; `useStartConversationByInquiry()` to Messaging; `useAdminListingRulesConfig()`/`useUpdateListingRulesConfig()` (`['admin-listing-rules-config']`, also invalidates `['listing-rules']`) to Admin)*
*Previously: 2026-09-16 (added `useMySessions()`/`useRevokeSession()` to the Auth section and `useAdminDeviceLimitConfig()`/`useUpdateDeviceLimitConfig()` to the Admin section — per-role device/session cap + self-service device removal, `readme/flows/admin.md`)*
*Previously: 2026-09-11 (added the Messaging (`features/messaging/`) and Admin messaging oversight (`features/admin-messaging/`) sections — member-to-member DM, `FEATURE_KEYS.MEMBER_CHAT`, see `readme/flows/messaging.md`)*

*Previously: 2026-09-10 (removed `useAdminWatchlistAlert(id?)` — the single-alert detail dialog it fed is gone; its two useful actions render directly on each `<WatchlistEntryAlertsDialog>` row now, needing no per-alert fetch)*
*Previously: 2026-09-10 (admin watchlist table corrected/updated: `useAdminWatchlistEntries`/`Infinite` rows now show their `memberId` param, `useAdminWatchlistMembers` row added, `useAdminWatchlistAlerts`/`useAdminWatchlistAlertsInfinite` replaced with `useAdminWatchlistEntryAlerts(entryId?)` — `/admin/watchlist` merged into one list, alerts are now reached per-entry instead of browsed as their own list)*
*Previously: 2026-09-10 (`useUpdateWantedEntry` renamed `useUpdateWatchlistEntry` — a LINKED bookmark's spec snapshot is now editable too, not just WANTED)*
*Previously: 2026-09-10 (removed `useSendWatchlistEntryAlert` — the manual self-send is gone; `usePublicListing` now also backs the `/listings/[id]` page)*
*Previously: 2026-09-04 (added `useSendWatchlistEntryAlert` — manual "send this entry's alert to my WhatsApp now", see `readme/flows/watchlist.md`)*

*Previously: 2026-09-04 (added `useSetWatchlistEntryNotify`/`useSetAllWatchlistNotify` — per-entry and bulk mute for Watchlist match alerts, see `readme/flows/watchlist.md`)*

*Previously: 2026-09-03 (Admin section catalog was still missing `useAdminFeatures`/`useFeatureMutations` (features), `useAdminPlans`/`usePlanMutations` (plans), the whole Subscriptions set (`useAdminSubscriptions`/`useAdminSubscriptionsInfinite`/`useCancelAdminSubscription`), and the whole Breach Incidents set (`useAdminBreachIncidents`/`useAdminBreachIncidentsInfinite`/`useAdminBreachIncident`/`useBreachIncidentMutations`) — this file is scoped as a catalog of *every* hook, so added all of them, matching the existing row conventions)*

*Previously: 2026-09-03 (Admin section was missing `useAdminSignupPlanConfig`/`useUpdateSignupPlanConfig` — added `GET`/`PUT /admin/settings/signup-plan` rows, `readme/flows/admin.md`'s Signup Plan tab)*

*Previously: 2026-07-24 (recurring autopay — `usePurchasePlan()` now takes `{ plan, isUpgrade }`; renamed `verifyPayment`/`fetchOrderStatus` to `verifySubscriptionPayment`/`fetchSubscriptionCheckoutStatus` (Subscriptions API, subscription-mode Checkout) — see `readme/flows/plans.md`)*

*Previously: 2026-07-24 (`useUnlockListing` now has no caller — the search page decides seller-reveal entitlement off the search hit's own `unlocked` field instead of calling this and reacting to a 403; see `readme/flows/leads.md`)*

*Previously: 2026-07-24 (wallet/points removed — dropped the Wallet section (`useBalance`/`useLedger`/`useLedgerInfinite`/`usePackages`/`useBuyPoints`) and the admin Packages/Transactions hooks; `useUnlockListing` is now a stateless entitlement check, not a spend; added the Payments note pointing at `features/payments/payments.api.ts`, the new home for `verifyPayment`/`fetchOrderStatus`)*

*Previously: 2026-07-21 (Auth section corrected to the real hook catalog — useRequestOtp/useVerifyOtp/useSignupStart/useSignupVerify/useSignupResend/useLogout; the previous useLogin/useRegister rows never existed in code)*
