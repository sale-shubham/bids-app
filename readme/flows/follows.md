# Follow a seller

Members follow a seller (a member who has listed at least one auction) and get a `followed-seller-listed` notification (generic rendering) when they list a new auction.

## API
- `POST /sellers/:id/follow`, `DELETE /sellers/:id/follow` -> `{ following, followerCount }` (idempotent). Errors `INVALID_FOLLOW` (400, yourself), `SELLER_NOT_FOUND` (404).
- `GET /members/:id/public` gains `followerCount` and (when logged in) `isFollowing`. The server-rendered seller page reads `followerCount`; the client reads `isFollowing` with the cookies.
- `GET /members/me/following?page&pageSize` -> paginated `{ id, name, avatarUrl, verified, ratingAvg, ratingCount, activeAuctions, followedAt }`.

## Code (`src/features/follows/`)
- `follows.api.ts`, `follows.errors.ts` (`followErrorMessage`), `use-follows.ts`: `useFollowState` (key `['follow', sellerId]`, off for guests), `useToggleFollow` (optimistic, rolls back on error), `useFollowing` (infinite, key `['following']`), `useUnfollowFromList` (row leaves the list at once, restored on error).
- `FollowButton`: guests are sent to `/login?next=`; hidden on your own profile, for SUPER_ADMIN and when the target has not listed an auction (`listedCount` from the public seller profile is 0; an auction page omits it, since its seller has listed by definition). `showCount` adds "N followers" (seller page header, which keeps the count when the button is hidden); `compact` is the small button on the seller card in `auction-detail.tsx`.
- `FollowingCard`: the "Following" tab in `ProfilePage` (not for SUPER_ADMIN): seller rows (link, rating, live count, followed date) with Unfollow (no confirm dialog: it is instantly reversible) and infinite scroll.
