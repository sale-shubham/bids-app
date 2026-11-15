# PAGINATION.md — Server-Side Pagination Standard

Every list pages on the **server** via react-query. No client-side filtering or slicing of server data.

---

## Rules

- Search via the `q` param — the backend does the filtering (`/admin/members`, `/admin/auctions`, `/auctions`).
- Every filter, `page` and `pageSize` that shapes the request is part of the react-query key, so a change refetches.
- A search or filter change MUST restart paging: offset lists go back to page 1, infinite lists start over (they do automatically, because the filters are in the key).
- API response shape: `{ success, data: T[], meta: { total, page, pageSize, totalPages } }` (the backend's paginated envelope). `parsePaged()` in `src/lib/paged.ts` decodes it into `{ items, meta }`, and `nextPagedParam()` is the matching `getNextPageParam`. The auctions lists decode their own envelope (`auctions.parse.ts`) because `GET /auctions` can also answer with a cursor (`meta.nextCursor`); `nextAuctionPage()` handles both.
- Page sizes are per list: admin tables default to **10** (`ADMIN_PAGE_SIZES` = 10 / 25 / 50); infinite lists use their feature constant (`AUCTION_PAGE_SIZE` 12, `WATCHLIST_PAGE_SIZE` 12, `BIDS_PAGE_SIZE` 20, `COMMISSIONS_PAGE_SIZE` 20, `NOTIFICATIONS_PAGE_SIZE` 20); admin cards load `MOBILE_PAGE_SIZE` = 100 per batch (`src/lib/pagination.ts`).

---

## Pattern 1 — infinite scroll (most lists)

`/auctions`, seller pages, `/watchlist`, `/my-bids`, `/notifications`, `/sell/auctions`, `/sell/commissions` and the full bid history are card or row lists that load more as you scroll, at every width.

```tsx
// In use-<feature>.ts
export function useMyAuctions(status: MineStatus) {
  return useInfiniteQuery({
    queryKey: ['auctions', 'mine', status],
    queryFn: ({ pageParam }) => api.fetchMyAuctions(status, pageParam),
    initialPageParam: FIRST,           // { page: 1 }
    getNextPageParam: nextAuctionPage, // nextPagedParam for a plain paged envelope
  });
}

// In the page component
const list = useMyAuctions(tab);
const items = list.data?.pages.flatMap((p) => p.items) ?? [];

// ...render items, then:
<InfiniteScroll
  onLoadMore={() => void list.fetchNextPage()}
  hasMore={!!list.hasNextPage}
  loading={list.isFetchingNextPage}
/>
```

`<InfiniteScroll>` (`src/components/common/infinite-scroll.tsx`) is an `IntersectionObserver` sentinel placed after the list; it renders nothing once there is nothing left. `/auctions` passes the server-rendered first page as `initialData`, so the list paints instantly and scrolling continues on the client (`useAuctionsList`).

---

## Pattern 2 — responsive table (admin lists)

The admin lists (`/admin/members`, `/admin/auctions`, `/admin/commissions`, `/admin/payments`) are a **table when the content area is wide** and **cards when it is narrow**, switched with CSS (`hidden @3xl/content:block` / `@3xl/content:hidden`) at **768px of content**: the width of `<main>`'s content box, not of the window. With the sidebar open a desktop window has to reach ~1,072px before the table shows; with it closed, ~816px; a phone always gets the cards. The two layouts paginate **differently**:

| Content area | Layout | Paging | Query |
|---|---|---|---|
| ≥ 768px (`@3xl/content`) | Table | Offset — numbered `ListPagination`, default `pageSize` 10 | `useQuery`, `enabled: !narrow` |
| < 768px | Cards | Infinite scroll — 100 per batch | `useInfiniteQuery`, `enabled: narrow` |

Both queries come from one hook, `useAdminList()` (`src/features/admin/use-admin.ts`):

```tsx
export function useAdminList<T, F extends object>(resource: string, filters: F, page: number, pageSize: number, fetcher) {
  const narrow = useIsNarrowContent();
  const desktop = useQuery({
    queryKey: ['admin', resource, 'list', filters, page, pageSize],
    queryFn: () => fetcher(filters, page, pageSize),
    enabled: !narrow,
    placeholderData: keepPreviousData,
  });
  const mobile = useInfiniteQuery({
    queryKey: ['admin', resource, 'infinite', filters],
    queryFn: ({ pageParam }) => fetcher(filters, pageParam, MOBILE_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam<T>,
    enabled: narrow,
  });
  // returns { desktop, mobile, mobileItems, error, refetch }
}
```

The page renders it with `<AdminList>` (`src/features/admin/components/admin-list.tsx`), which adds an error state with Retry and passes everything to **`<ResponsiveList>`** (`src/components/common/responsive-list.tsx`). `ResponsiveList` owns the CSS switch, skeletons, empty states, `ListPagination` and the `<InfiniteScroll>` sentinel; pages supply only `renderTable(items)`, `renderCard(item)` and `getKey`. Don't hand-roll the table/cards scaffolding per page.

Rules:

- **Both keys share a prefix.** The table key `['admin', resource, 'list', …]` and the cards key `['admin', resource, 'infinite', …]` both start with `['admin', …]`, so the mutations' `invalidateQueries({ queryKey: ['admin'] })` refreshes whichever list is showing. A sibling key such as `['admin-members-infinite', …]` would not be caught, and the cards would go stale after a mutation.
- **Exactly one query fetches**, gated by `useIsNarrowContent()` (`@/hooks/use-is-narrow-content`). It measures the same content box at the same 48rem as the CSS switch and re-measures on the sidebar toggle (a `ResizeObserver` on `<main>`), so the running query always belongs to the visible layout. Never gate on the window: the cards could show with the sidebar open while only the table's query runs, an empty list.
- **Filters live in the URL.** `useUrlState(defaults)` (`src/features/admin/use-url-state.ts`) reads the filters, `page` and `pageSize` from the search params; changing any filter drops `page`, so the table goes back to page 1, and the filters are in both keys, so the cards start over.
- `useIsNarrowContent()` gates data only (never markup), so there is no hydration mismatch.

Reference wiring: `src/app/(admin)/admin/members/page.tsx`.

---

## Banned patterns

```tsx
// ❌ NEVER — client-side filtering of server data
const filtered = auctions.filter((a) => a.title.includes(search));

// ❌ NEVER — client-side slicing for pagination
const pageRows = auctions.slice(offset, offset + pageSize);

// ❌ NEVER — search doesn't restart paging
setSearch(q);
// missing: back to page 1 (useUrlState's update() does this for you)
```

---

## Pagination UI

`ListPagination` (`src/components/common/list-pagination.tsx`): offset, numbered pages + an optional rows-per-page selector, built on the shadcn `ui/pagination` primitive. Pass `total`, `currentPage`, `pageSize`, `onPageChange`; add `onPageSizeChange` to show the rows selector. Today it is rendered only by `ResponsiveList`:

```tsx
<ListPagination
  total={desktop.meta.total}
  currentPage={desktop.meta.page}
  pageSize={desktop.meta.pageSize}
  onPageChange={desktop.onPageChange}
  onPageSizeChange={desktop.onPageSizeChange}
  hideOnSinglePage
/>
```

Its default `pageSizeOptions` are 10 / 25 / 50 / 75 / 100. `ResponsiveList` doesn't pass `pageSizeOptions`, so the admin selector also offers 75 and 100, which `useUrlState` does not accept (it falls back to 10).

---

## Pickers (dropdowns fed by the API)

Same rule as lists: **a dropdown whose options are an entity list from the API searches on the server** — never load a whole table and filter it in the browser.

- API-backed dropdown = **`RemoteSelect`** (`src/components/common/remote-select.tsx`). Look and keyboard match `ui/select`; the search box sends a debounced (300ms) `q`, pages come 25 at a time, the next page loads when the list is scrolled to the bottom (`useInfiniteQuery`, enabled only while open), with loading / "No results found." / error + Retry states and an "x of N" count. No page uses it yet.
- Constant dropdowns (page size, sort, status and role filters, auction condition) stay on **`ui/select`**, which searches its handful of items client-side. So do short configuration lists the API returns whole, such as the auction categories (`GET /auctions/categories`, `useCategories()`) in `AuctionForm` and the `/auctions` filter bar.
- Fetchers for `RemoteSelect` return `{ rows, total }` from the paged envelope (`meta.total`). `queryKey` is the entity's cache **prefix**; `RemoteSelect` appends `'search', { q, pageSize }` for the list and `'selected', id` for the label lookup, so `invalidateQueries({ queryKey: prefix })` still reaches pickers. Anything besides `q` that changes the result set (filters, excluded ids) MUST be in the prefix.
- A value that is not on the loaded page (a URL-seeded filter, an edit form) gets its label from `selected` (a record the caller already has) or `fetchSelected(id)` — never by loading the list.
- Sentinels ("All …") go through `leadingOptions`, not a fake record.
