# PAGINATION.md — Server-Side Pagination Standard

Every list page uses **server-side pagination** via react-query. No client-side filtering or slicing of server data.

---

## Rules

- Search via `?q=` query param — backend does the filtering
- `page` and `pageSize` included in react-query key so refetch triggers on change
- Default `pageSize: 10` for all lists (member-facing and admin) — the rows-per-page selector (`10/25/50/75/100`) lets users bump it
- Search query change MUST reset `page` to `1`
- API response shape: `{ data: T[], meta: { total, page, pageSize, totalPages } }` (backend `paginated()` envelope; `success` flag alongside)

---

## Pattern

```tsx
// In use-<feature>.ts
export function useListings(page: number, pageSize: number, search: string) {
  return useQuery({
    queryKey: ['listings', { page, pageSize, search }],
    queryFn: () => api.get('/listings', { params: { page, pageSize, q: search } }).then(r => r.data),
  });
}

// In page component
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');
const pageSize = 10;

const { data, isLoading } = useListings(page, pageSize, search);

// Reset page on search change
const handleSearch = (q: string) => {
  setSearch(q);
  setPage(1);  // ← mandatory
};
```

---

## Banned patterns

```tsx
// ❌ NEVER — client-side filtering of server data
const filtered = listings.filter(l => l.title.includes(search));

// ❌ NEVER — client-side slicing for pagination
const page = listings.slice(offset, offset + pageSize);

// ❌ NEVER — search doesn't reset page
setSearch(q);
// missing: setPage(1)
```

---

## Pagination UI

Use `ListPagination` from `src/components/common/list-pagination.tsx` (offset, numbered pages + rows-per-page selector). Built on the shadcn `ui/pagination` primitive. Pass `total`, `currentPage`, `pageSize`, `onPageChange`; optionally `onPageSizeChange` to show the rows selector.

```tsx
<ListPagination
  total={data?.meta.total ?? 0}
  currentPage={data?.meta.page ?? page}
  pageSize={pageSize}
  onPageChange={setPage}
  onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
  hideOnSinglePage
/>
```

Reference wiring: `src/app/(admin)/admin/members/page.tsx`.

---

## Responsive pagination (desktop table vs mobile cards)

List pages are responsive: a **table when the content area is wide** and **cards when it is narrow**, switched with CSS (`hidden @3xl/content:block` / `@3xl/content:hidden`) at **768px of content** — the width of `<main>`'s content box, not of the window (2026-10-28). With the sidebar open a desktop window has to reach ~1,072px before the table shows; with it closed, ~816px; a phone always gets the cards. Before this the switch was the viewport `md:`, so a desktop with the sidebar open kept the table in far less room and it scrolled sideways. The two layouts paginate **differently**:

| Content area | Layout | Paging | Hook |
|---|---|---|---|
| ≥ 768px (`@3xl/content`) | Table | Offset — numbered `ListPagination`, default `pageSize: 10` | `useXxx(..., enabled)` (`useQuery`) |
| < 768px | Cards | Infinite scroll — 100/batch, auto-load at end | `useXxxInfinite(..., enabled)` (`useInfiniteQuery`) |

Use the **`<ResponsiveList>`** wrapper (`src/components/common/responsive-list.tsx`) — it owns the CSS switch, skeletons, empty states, `ListPagination`, and the `<InfiniteScroll>` sentinel. Pages supply only `desktop.renderTable(items)`, `mobile.renderCard(item)`, and the two hook results. Don't hand-roll the table/cards scaffolding per page.

Rules:

- Add an infinite variant (`use<Feature>Infinite`) alongside the offset hook; page size `MOBILE_PAGE_SIZE = 100`, `getNextPageParam` advances while `page < totalPages`.
- **The infinite key MUST share the offset key's prefix** — e.g. offset `['admin-members', {…}]` → infinite `['admin-members', 'infinite', {…}]`. react-query prefix-matching only treats same-first-element keys as related, so a sibling like `['admin-members-infinite', …]` would NOT be caught by existing `invalidateQueries(['admin-members'])` and the mobile list would go stale after mutations.
- Gate BOTH hooks with `useIsNarrowContent()` (`@/hooks/use-is-narrow-content`): table `enabled: !isNarrow`, cards `enabled: isNarrow`. Exactly one fetches — never both. It measures the same content box at the same 48rem as the CSS switch, and re-measures on the sidebar toggle (a `ResizeObserver` on `<main>`), so the query running is always the visible layout's. Never gate on the window: the cards would show with the sidebar open while only the table's query runs — an empty list. (`/search` is the one exception: its grid is identical on both sides, only the paging differs, so it keeps the viewport `useIsMobile()`.)
- Mobile cards render `<InfiniteScroll onLoadMore={fetchNextPage} hasMore={!!hasNextPage} loading={isFetchingNextPage} />` (`src/components/common/infinite-scroll.tsx`) after the flattened list.
- Filter/tab/search changes are part of both query keys, so switching resets the infinite list automatically; the offset side still resets `page` to 1.
- `useIsNarrowContent()` gates data only (never markup) → no hydration mismatch.

Reference wiring: `src/app/(admin)/admin/members/page.tsx`.

---

## Pickers (dropdowns fed by the API)

Same rule as lists: **a dropdown whose options come from the API searches on the server** - never load the whole list and filter it in the browser (and never rely on a capped "options" fetch: admin options were silently cut at 200).

- API-backed dropdown = **`RemoteSelect`** (`src/components/common/remote-select.tsx`). Look and keyboard match `ui/select`; the search box sends a debounced (300ms) `?q=`, pages come 25 at a time (`pageSize=25`), the next page loads when the list is scrolled to the bottom (`useInfiniteQuery`, enabled only while open), with loading / "No results found." / error + Retry states and an "x of N" count.
- Constant dropdowns (page size, sort, status/severity/data type enums, `DynamicSpecField` DROPDOWN options embedded in the product response) stay on **`ui/select`** (client-side search over a handful of hardcoded items - there is no API to ask).
- Fetchers return `{ rows, total }` from the paged envelope (`meta.total`). `queryKey` is the entity's cache **prefix** (e.g. `['admin-inquiry-members']`); `RemoteSelect` appends `'search', { q, pageSize }` for the list and `'selected', id` for the label lookup, so `invalidateQueries({ queryKey: prefix })` still reaches pickers. Anything besides `q` that changes the result set (filters, `excludeIds`) MUST be in the prefix.
- A value that is not on the loaded page (URL-seeded `?memberId=` / `?businessId=`, edit forms, saved signup plan slug) gets its label from `selected` (a record the caller already has) or `fetchSelected(id)` (`GET .../:id`) - never by loading the list.
- Sentinels ("All members", "All plans") go through `leadingOptions`, not a fake record.
- Pickers that must not collide with an existing shared fetch use their own prefix (`['my-businesses', 'picker', filters]` vs. the `['my-businesses', { pageSize: 50 }]` that `BusinessGuard` shares).

Reference wiring: `src/app/(admin)/admin/members/page.tsx` (`MemberPicker`), `src/features/listings/listing-form.tsx` (product + business).
