# Zustand Stores

State that must outlive a single component lives in a Zustand store under `src/store/`. There are **three**: auth, live and recently viewed. Server data is owned by TanStack Query (see `readme/methods/hooks.md`); a store holds only what the query cache should not own: who is signed in, the live connection and server clock, and a per-device history.

| Store | File | Persisted | Holds |
|---|---|---|---|
| `useAuthStore` | `src/store/auth-store.ts` | no | signed-in member + `initialized` flag |
| `useLiveStore` | `src/store/live-store.ts` | no | server clock offset, WebSocket status, reconnect counter |
| `useRecentlyViewedStore` | `src/store/recently-viewed-store.ts` | yes (`localStorage`) | last 10 auction cards opened on this device |

All three are plain `create(...)` stores with no `devtools` middleware. Unit tests: `src/store/stores.test.ts`.

## Auth store (`src/store/auth-store.ts`)

Holds the current member and a one-time `initialized` flag, so the UI can tell "still checking the session" from "definitely logged out". Not persisted: the session's source of truth is the httpOnly `nb_at` / `nb_rt` cookies (see `readme/methods/api-client.md`), re-checked on every page load by `AuthBootstrap`.

### State shape

| Field | Type | Notes |
|---|---|---|
| `member` | `AuthMember \| null` | the signed-in member, or `null` when logged out |
| `initialized` | `boolean` | `false` until `AuthBootstrap` has an answer; gates `<AuthGuard>` and auth-dependent UI (bid panel, watch button, user menu, live socket) |

### `AuthMember` (exported interface)

The `GET /members/me` shape. The login / signup-verify bodies may carry a subset; `useSignedIn()` invalidates `['me']` right after so the refetch fills in the rest.

| Field | Type |
|---|---|
| `id` | `string` |
| `email` | `string` |
| `name` | `string` |
| `phone` | `string \| null` |
| `avatarUrl` | `string \| null` |
| `address` | `string \| null` |
| `role` | `Role` = `'MEMBER' \| 'SUPER_ADMIN'` (re-exported from `src/constants/routes.ts`). `setMember()` runs the value through `normalizeRole()`, so a legacy `'BIDDER'` / `'AUCTIONEER'` from the API is stored as `'MEMBER'` |
| `isActive` | `boolean` |
| `emailVerifiedAt` | `string \| null` |
| `unpaidCommissionPaise` | `number` (drives `<UnpaidCommissionBanner>` and blocks creating an auction in `<AuctionForm>`) |
| `auctionsWon` | `number` |
| `moneySpentPaise` | `number` |
| `createdAt` | `string` (ISO date) |
| `deviceLimit` | `number` (this account's concurrent-session cap; the Profile page reads it) |

`role` drives the post-login landing (`homeFor()`: `SUPER_ADMIN` -> `/admin`, `MEMBER` -> `/auctions`, with `?next=` honoured for non-admins) and `<AuthGuard allow={[...]}>`.

### Actions

| Action | Effect | Called by |
|---|---|---|
| `setMember(m: AuthMember \| null)` | sets or clears `member` | `AuthBootstrap` (mirrors the `['me']` result); `useSignedIn()` in `use-auth.ts` (after `useLogin` / `useSignupVerify` succeed); `useUpdateMe` (merges the updated fields into the current member) |
| `setInitialized(v: boolean)` | marks the session check done | `AuthBootstrap`: at once on guest-only routes, otherwise once `['me']` has settled (not when it failed only because the API was unreachable) |
| `clear()` | `member = null`; leaves `initialized` untouched | `useLogout` / `useLogoutAll` (via `useSessionEnded`); `forceLogout()` and `forceSuspended()` in `api-client.ts` |

### Selectors / usage

Select the narrowest slice you need:

```ts
const member = useAuthStore((s) => s.member);
const isMember = useAuthStore((s) => !!s.member);
const unpaid = useAuthStore((s) => s.member?.unpaidCommissionPaise ?? 0);

// outside React (interceptors, event handlers)
useAuthStore.getState().clear();
const meId = useAuthStore.getState().member?.id;
```

`<AuthGuard>` and `AuthBootstrap` destructure the whole store (`const { member, initialized } = useAuthStore()`); avoid that in frequently rendered components.

### How it pairs with the cookies and the bootstrap

1. **Reload**: the store resets (`member: null`, `initialized: false`); the cookies survive on their own.
2. `AuthBootstrap` runs `useQuery({ queryKey: ['me'], queryFn: fetchMe })` (skipped on `AUTH_ROUTES`). If the access cookie expired, the 401 triggers the interceptor's silent refresh and `/members/me` is replayed.
3. An effect mirrors the result once `isFetched`: success -> `setMember(data)`, error -> `setMember(null)`, then `setInitialized(true)`. An unreachable-API error leaves both untouched (the query retries), so `<AuthGuard>` keeps its loader instead of bouncing to `/login`.
4. **Login / signup verify**: the backend sets the cookies; `useSignedIn()` calls `resetAuthFlags()`, `setMember(member)`, invalidates `['me']` and navigates.
5. **Logout**: the backend clears the cookies; `useSessionEnded()` calls `clear()`, `queryClient.clear()`, `syncAppBadge(0)` and `router.push('/login')`.

Because `['me']` (`ME_KEY` in `src/features/members/use-members.ts`) is a real query, invalidating it refetches and re-syncs the store. `useUpdateMe` and `usePayCommission` do this, so for example `unpaidCommissionPaise` drops right after a commission is paid.

## Live store (`src/store/live-store.ts`)

Shared live state for countdowns and the WebSocket (see `readme/flows/websocket.md`).

| Field / action | Type | Notes |
|---|---|---|
| `serverOffsetMs` | `number` | server clock minus device clock, default `0` |
| `syncServerTime(iso)` | `(serverTimeIso: string) => void` | sets `serverOffsetMs = Date.parse(iso) - Date.now()`; ignores an unparseable value |
| `status` | `LiveStatus` = `'idle' \| 'connecting' \| 'open' \| 'closed' \| 'unavailable'` | this tab's socket state, default `'idle'` |
| `setStatus(s)` | `(s: LiveStatus) => void` | |
| `connectionSeq` | `number` | bumped on every successful (re)connect, default `0` |
| `markConnected()` | `() => void` | `connectionSeq + 1` |

Writers:

- `syncServerTime`: `auctions.api.ts` (every decoded auction response with a `serverTime`), `bids.api.ts` (`placeBid`), and `<AuctionList>` / `<AuctionDetailView>` for the server-rendered pages.
- `setStatus` / `markConnected`: `LiveSocketProvider` (`src/features/live/live-socket-provider.tsx`), subscribed to the socket's status and open events.

Readers:

- `useServerNow()` (`src/components/common/countdown.tsx`) adds `serverOffsetMs` to its shared 1 s tick, so every `<Countdown>`, the bid panel and bid history follow the server's clock.
- `useAuction(id)` polls every 10 s only while `status !== 'open'`, and refetches once whenever `connectionSeq` changes (to catch events missed while disconnected).
- `<LiveIndicator>` shows whether `status === 'open'`.

## Recently viewed store (`src/store/recently-viewed-store.ts`)

The last auctions this device opened, shown by `<RecentlyViewed>` under the list on `/auctions`.

| Field / action | Type | Notes |
|---|---|---|
| `items` | `AuctionCard[]` | newest first, at most 10 |
| `add(card)` | `(card: AuctionCard) => void` | puts `card` first, drops any older entry with the same `id`, trims to 10 |
| `clear()` | `() => void` | empties the list |

- Persisted with `persist` under the key `nb-recently-viewed` (`version: 1`) through a `safeStorage` wrapper: if `localStorage` is missing or throws (private mode, blocked site data), reads return `null` and writes are ignored, so the store keeps working in memory.
- `skipHydration: true`: the server render has no `localStorage`, so readers call `useRecentlyViewedStore.persist.rehydrate()` after mount to avoid a hydration mismatch. `<RecentlyViewed>` and `<AuctionDetailView>` both do.
- `<AuctionDetailView>` records a visit on mount with a card snapshot of the auction (id, title, category, condition, cover image, prices, bid count, times, status, seller), not the description.
- Not cleared on logout: it is per device, not per account.

## Notes

### Adding a new store

1. Create `src/store/<name>-store.ts` with `create<State>((set, get) => ({ ...state, ...actions }))`.
2. Export the `useXxxStore` hook and any shared types.
3. Prefer TanStack Query for **server** data; use a store only for client or session state (identity, connection state, per-device history).
4. Add `persist` only if the data must survive a reload and is safe to keep client-side. Use a storage wrapper that tolerates a throwing `localStorage`, and `skipHydration` + `rehydrate()` after mount if a server-rendered page reads it.
5. Select narrow slices in consumers.
6. Add tests to `src/store/stores.test.ts` and document the store here.

### Anti-patterns

- Persisting tokens or the `member` to `localStorage`: it defeats the cookie-based model.
- Copying server data (auctions, bids, commissions) into a store: that is the query cache's job. The recently viewed list is a deliberate per-device snapshot, not a cache of server data.
- Subscribing to a whole store in a frequently rendered component.

### Reference files

- `src/store/auth-store.ts`, `src/store/live-store.ts`, `src/store/recently-viewed-store.ts`
- `src/store/stores.test.ts`
- `src/providers/auth-bootstrap.tsx`, `src/features/auth/use-auth.ts`, `src/features/members/use-members.ts`
- `src/features/live/live-socket-provider.tsx`, `src/components/common/countdown.tsx`

*Last updated: 2026-11-15 (rewritten against the current code: three stores (auth, live, recently viewed), the real `AuthMember` fields and roles, `['me']` key)*
