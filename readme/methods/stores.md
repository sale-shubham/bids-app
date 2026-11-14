# Zustand Stores

State that must outlive a single component lives in a Zustand store under `src/store/`. There are **two** stores — auth and admin-settings — because most server state is owned by react-query (see `readme/methods/hooks.md`). Zustand is reserved for the small slice of state react-query should not own alone: the signed-in member/bootstrap flag, and (for admin-settings) a last-saved cache that must survive a component unmounting.

## Admin settings store (`src/store/admin-settings-store.ts`)

Holds a last-known-good cache, both scoped to `/admin/settings`'s Signup Plan tab (`SignupPlanCard`, `readme/flows/admin.md`), whose `<TabsContent>` unmounts on every tab switch (Radix default — kept intentionally, switching tabs is meant to reload the form from the stored value, not preserve an in-progress edit):

- `signupPlanConfig: SignupPlanConfig | null` + `setSignupPlanConfig()` — the saved plan + expiry.

**The live query is always the source of truth once it has resolved, for both** — `SignupPlanCard` does `const config = fetched ?? storedConfig` and `const plans = fetchedPlans ?? storedPlans`, fetched-first in both cases; neither store value should ever be preferred over a present fetched value. (An earlier version of this card did `storedConfig ?? fetched`, store-first — that's a bug: `??` only falls through on `null`/`undefined`, so if the store ever held a stale-but-non-null object it would permanently shadow correct fresh query data forever. Don't reintroduce that ordering.)

The store is a fallback used only for the instant right after a remount before the respective query has data (from cache or network): for `signupPlanConfig` that avoids a flash back to an empty form; for `signupPlans` it avoids the Plan `<Select>` having zero options to match its already-correct value against. Getting the `??` ordering right on both was **not** sufficient by itself, though — the Plan `<Select>` still went blank on a warm remount until `SignupPlanCard`'s `useForm` was changed to seed `defaultValues` straight from `config` at construction, instead of leaving them blank and correcting them via a `reset()` effect after first paint (Radix `Select` doesn't reliably refresh its trigger label for a value that changes from blank to real post-mount) — see `readme/flows/admin.md`'s 2026-09-03 entry for the full diagnosis.

`useUpdateSignupPlanConfig()`'s `onSuccess` writes the saved payload both into `signupPlanConfig` AND directly into the query cache (`qc.setQueryData(['admin-signup-plan-config'], saved)`, ahead of the `invalidateQueries` background reconcile) so the query itself is correct the instant a save resolves — no window where a remount could read a stale cached copy. `signupPlans` has no equivalent write-on-save path (this card doesn't mutate the plan catalog) — it's populated purely from `useAdminPlans()`'s own successful fetches. Neither is persisted (no `persist` middleware) — both reset on a hard page reload, which is fine since their queries refetch then anyway.

## Purpose

The auth store (`src/store/auth-store.ts`) holds the current member identity and a one-time `initialized` flag so the UI can tell "still checking the session" from "definitely logged out". It is intentionally minimal and is **not persisted** — the source of truth for the session is the httpOnly refresh cookie + in-memory access token (see `readme/methods/api-client.md`), re-validated on every page load by `AuthBootstrap`.

## State shape

`useAuthStore` is created with a plain `create<AuthState>(...)` (no `persist`, no `devtools` middleware).

| Field | Type | Notes |
|---|---|---|
| `member` | `AuthMember \| null` | the signed-in member, or `null` when logged out |
| `initialized` | `boolean` | `false` until `AuthBootstrap` finishes its first `/members/me` attempt; gates auth-dependent UI / `<AuthGuard>` |

### `AuthMember` (exported interface)

| Field | Type |
|---|---|
| `id` | `string` |
| `mobile` | `string` |
| `email` | `string` |
| `name` | `string \| null` |
| `role` | `'SUPER_ADMIN' \| 'MEMBER'` |
| `isActive` | `boolean` |
| `features?` | `string[]` |
| `createdAt?` | `string` (ISO date) |
| `deviceLimit?` | `number` — this account's own device cap (`memberLimit` / `superAdminLimit` for its role), 2026-10-30 |

`createdAt` (2026-10-22) is optional for the same reason as `features` (see below): only the `GET /members/me` payload carries it; the Profile page's identity card shows it as "Member since" and simply omits the line when it's absent (`readme/ui/layout.md`).

`role` drives the post-login redirect (`SUPER_ADMIN` → `/admin`, otherwise `/businesses`) and admin-area access. There is no `status`/approval concept on Member — only `isActive` (deactivation). Company/seller data lives on `Business` (`readme/flows/business.md`), never in this store. The old `actor`/sub-member concept is fully removed — `SubMember` no longer exists. `features` is optional because the lighter OTP-verify login payload (`auth.api.verifyOtp()`) omits it — `AuthBootstrap`'s immediate `GET /members/me` fetch fills it in right after. It's the raw list of `Feature.key` strings unlocked on the member's active plan (a key's presence means true — no per-key boolean map); replaces the old `entitlementTier`/`{ showAddress, showContact }` shape, which was stale against the current buyer-pay catalog. Same shape/key set as `src/constants/features.ts`'s `FEATURE_KEYS` and `readme/flows/search.md`'s `meta.features` (search results carry their own copy of this list — a search hit isn't necessarily fetched with a fresh member session). `walletBalance` was removed along with the wallet/points feature.

## Methods (actions)

### `setMember(m)`

Sets (or clears) the current member.

- **Params:** `m: AuthMember | null`.
- **Returns:** `void`.
- **Called by:** `AuthBootstrap` after `fetchMe()` resolves/rejects; `useVerifyOtp`'s `onSuccess` with the member returned by `auth.api.verifyOtp()`; `useSignupVerify`'s `onSuccess` with the member returned by `auth.api.signupVerify()` once `status === 'COMPLETE'`; `useUpdateMyName`'s `onSuccess` (2026-10-22), which spreads the current member and replaces only `name` so the topbar label updates before the `['member-me']` refetch lands.

### `setInitialized(v)`

Marks the one-time session check complete.

- **Params:** `v: boolean`.
- **Returns:** `void`.
- **Called by:** `AuthBootstrap` in the `finally` of its bootstrap effect (always runs, success or failure).

### `clear()`

Resets `member` to `null` (leaves `initialized` untouched). Used on logout.

- **Params:** none.
- **Returns:** `void`.
- **Called by:** `useLogout`'s `onSuccess` (alongside `queryClient.clear()` and a redirect to `/login`).

## Selectors / usage

There is no state/actions split — consumers select exactly the slice they need to keep re-renders tight:

```ts
// whole store (use sparingly — re-renders on any field change)
const { member, initialized } = useAuthStore();

// single-field selectors (preferred in hot paths)
const setMember = useAuthStore((s) => s.setMember);
const clear = useAuthStore((s) => s.clear);
```

## How it pairs with the httpOnly token cookies + bootstrap

The store holds **identity** only (`member`, `initialized`) — both tokens (`nb_at`/`nb_rt`) are httpOnly cookies the backend manages; nothing token-related lives in this store or in `api-client.ts` (see `readme/methods/api-client.md`).

1. **Reload** → store resets (`member: null`, `initialized: false`) — the cookies themselves survive fine, the store just doesn't know who's logged in yet.
2. `AuthBootstrap` runs `useQuery({ queryKey: ['member-me'], queryFn: fetchMe, retry: false })` — the cookies ride along automatically (`withCredentials`); if the access cookie happened to be expired, a 401 triggers the axios interceptor's silent refresh, then `/members/me` is replayed.
3. A `useEffect` syncs the query result into the store once `isFetched`: success → `setMember(data)`; error → `setMember(null)`; either way → `setInitialized(true)`.
4. **Verify OTP (login)** → backend sets the cookies via `Set-Cookie`; `useVerifyOtp` calls `setMember(...)`. **Signup (`status: 'COMPLETE'`)** → same, via `useSignupVerify`.
5. **Logout** → backend clears the cookies; `useLogout` calls `clear()` + `queryClient.clear()`.

Because `['member-me']` is a real react-query cache entry (not a one-off effect), `qc.invalidateQueries({ queryKey: ['member-me'] })` — already called by `usePurchasePlan`/`useCancelSubscription` — actually **refetches and re-syncs the store**, so e.g. `member.features` updates live after a plan purchase instead of only on next reload. Because nothing is persisted to storage, a closed tab simply re-runs the bootstrap on next open — no stale member can survive a refresh.

## Notes

### Adding a new store

1. Create `src/store/<name>-store.ts` with `create<State>((set, get) => ({ ...state, ...actions }))`.
2. Export the `useXxxStore` hook and any shared interfaces (like `AuthMember`).
3. Prefer react-query for **server** state — only reach for a store when state is genuinely client/session-scoped (UI mode, identity, cross-route ephemeral selection).
4. Add `persist` middleware **only** if the data must survive reload AND is safe to store client-side. Auth deliberately does **not** persist (cookie is the source of truth).
5. Select narrow slices in consumers; avoid subscribing to the whole store in hot components.
6. Document the new store here (a state table + actions section).

### Anti-patterns

- ❌ Persisting tokens or the `member` to `localStorage` — defeats the cookie-based security model.
- ❌ Duplicating server state (listings, subscriptions, members) into a store — that is react-query's job.
- ❌ Subscribing to the entire store in a frequently-rendered component.

### Reference files

- `src/store/auth-store.ts` (canonical)
- `src/providers/auth-bootstrap.tsx`
- `src/features/auth/use-auth.ts`

*Last updated: 2026-10-30 (`AuthMember` gained optional `deviceLimit` from `GET /members/me` — the Profile page shows its Devices tab only when it is above 1)*
*Previously: 2026-10-22 (`AuthMember` gained optional `createdAt` — "Member since" on the Profile page; `setMember` is also called by `useUpdateMyName` after a name edit)*

*Previously: 2026-09-03 (admin-settings store: added `signupPlans`/`setSignupPlans`, the same last-known-good-on-remount treatment `signupPlanConfig` already had, now covering the Plan `<Select>`'s options list too — see `readme/flows/admin.md`'s 2026-09-03 entry)*

*Previously: 2026-07-24 (removed `walletBalance` from `AuthMember` — the wallet/points feature was removed entirely; `['member-me']` invalidation is now called by `useUnlockListing`/`usePurchasePlan`/`useCancelSubscription`, not the deleted `useBuyPoints`)*

*Previously: 2026-07-22 (removed dead `useAuth()` re-export — zero callers; rewrote the bootstrap section, stale since the in-memory-token era — both tokens are httpOnly cookies now, route gating reads the backend's real `nb_at` cookie via `src/proxy.ts` + `jose`, not a client-set hint — see `readme/flows/auth.md`)*

*2026-11-02: `signupPlans`/`setSignupPlans` removed - the Plan dropdown is now a server-searched `RemoteSelect` whose label comes from `GET /admin/plans/:slug`, so no plan list needs to survive a remount. The notes above about `signupPlans` describe the superseded design.*
