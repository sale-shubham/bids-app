# Admin pages (super admin) - how to build one

Pilots: `src/app/(admin)/admin/members/page.tsx` and `src/app/(admin)/admin/auctions/page.tsx`. Copy them. Modelled on the Unikorn app's compact list page (header, toolbar, responsive list), with bids-app tokens and filters kept in the URL.

## Components

| Need | Use | Where |
|---|---|---|
| Title row | `PageHeader` `{ title, description?, backHref?, backLabel?, action?, className? }` | `components/common/page-header.tsx` |
| Search, tabs, filters | `ListToolbar` `{ tabs?, search?, activeFilters?, onClearFilters?, children? }` | `components/common/list-toolbar.tsx` |
| Select filter in the panel | `FilterSelect` `{ value, onChange, options: {value,label}[], allLabel, ariaLabel }` (`''` = no filter) | same file |
| Status tabs | `StatusTabs` `{ value, tabs, onChange }` | `features/admin/components/admin-list.tsx` |
| Debounced search | `SearchInput` `{ value, onChange, placeholder }` (500ms) | `components/common/search-input.tsx` |
| Table on wide, cards on narrow, pagination / infinite scroll, skeleton, empty, error + "Try again" | `AdminList<T>` `{ list, page, onPageChange, onPageSizeChange, renderTable, renderCard, getKey, empty }` | `features/admin/components/admin-list.tsx` (wraps `components/common/responsive-list.tsx`) |
| Row actions | `RowActionsMenu` `{ name, actions: RowAction[] }`, `RowAction = { label, icon, onSelect?, href?, destructive?, separated?, disabled?, hint? }` | `components/common/row-actions-menu.tsx` |
| Status pills | `StatusBadge` (never inline coloured spans) | `components/common/status-badge.tsx` |
| Confirm | `ConfirmDialog` (page-level, one per action) | `components/common/confirm-dialog.tsx` |
| URL state | `useUrlState(DEFAULTS)` returns `{ values, page, pageSize, update }` | `features/admin/use-url-state.ts` |
| Data | `useAdminList(resource, filters, page, size, fetcher)` (offset query wide, infinite query narrow) | `features/admin/use-admin.ts` |

Admin pages import the common `PageHeader` (`components/common/page-header.tsx`) directly; the old `admin-list.tsx` adapter was removed.

## Skeleton

```tsx
'use client';
function XView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);          // DEFAULTS = { q: '', kind: '' }
  const kind = KINDS.some((k) => k.value === values.kind) ? values.kind : ''; // validate URL values
  const list = useAdminX({ q: values.q, kind }, page, pageSize);
  // action targets + mutations here

  const actions = (row: Row) => <RowActionsMenu name={row.name} actions={[
    { label: 'Edit', icon: Pencil, onSelect: () => setEditTarget(row) },
    { label: 'Delete', icon: Trash2, destructive: true, separated: true, onSelect: () => setDeleteTarget(row) },
  ]} />;

  return (
    <div className="space-y-4">
      <PageHeader title="Things" action={<Button>New thing</Button>} />
      <ListToolbar
        tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ status: v })} />}   // optional
        search={<SearchInput value={values.q} onChange={(q) => update({ q })} placeholder="Search name" />}
        activeFilters={[kind].filter(Boolean).length}
        onClearFilters={() => update({ kind: '' })}
      >
        <FilterSelect value={kind} onChange={(v) => update({ kind: v })} options={KINDS} allLabel="All kinds" ariaLabel="Kind" />
      </ListToolbar>
      <AdminList<Row>
        list={list} page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(r) => r.id}
        empty={{ icon: Box, title: 'No things found', description: 'Try a different search or filter.' }}
        renderTable={(items) => <Table>...last column: <TableCell className="text-right">{actions(r)}</TableCell></Table>}
        renderCard={(r) => <Card><CardContent className="space-y-2 p-4">...{actions(r)} in the top-right...</CardContent></Card>}
      />
      {/* page-level dialogs: ConfirmDialog per destructive action */}
    </div>
  );
}
export default function Page() { return <Suspense><XView /></Suspense>; } // useSearchParams needs Suspense
```

## Rules

1. Page body is `<div className="space-y-4">`: PageHeader, ListToolbar, AdminList, dialogs. Nothing else. No stat cards, banners, intro text or extra Cards on list pages. Chrome (sidebar, top bar, auth) belongs to the layout.
2. List pages pass no `description` to `PageHeader`; the title says what it is.
3. One primary action, the only solid button, in the header `action`, placed last. Secondary header actions are `variant="outline"`. Row actions never live in the header.
4. Every filter goes in the `ListToolbar`: tabs in `tabs`, search in `search`, selects as `FilterSelect` children (they live in the Filters panel, which opens by itself when a filter is already set). Never a hand-rolled filter row. Always this one layout: tabs left, search + Filters right.
5. Filter state is in the URL via `useUrlState`. Validate each value read from the URL against the options you offer, and never send a value the UI does not offer. Changing a filter resets `page`.
6. Mobile is cards, desktop is a table, both through `AdminList`; the switch is the `@3xl/content` container query (768px of content). Layout inside page bodies uses container queries (`@lg/content:`), never bare `sm:` / `md:` (docs/CONTAINER_QUERIES.md).
7. Row actions live in one `RowActionsMenu` (the same on table row and card). Destructive ones are `destructive` + `separated` and open a page-level `ConfirmDialog` (docs/CONFIRM_DIALOG.md); mutations toast success and error exactly as before.
8. Table: header `h-11 text-xs uppercase` (the `TableHead` default), cells `px-4 py-3 text-sm`, numbers `tnum` and right-aligned, money through `formatINR`. Actions column: `w-12`, sr-only header. Cards: `<Card><CardContent className="space-y-2 p-4">`, three spacing steps only (`space-y-2` between blocks).
9. Statuses use `StatusBadge` / the feature's badge. Empty copy differs for "nothing exists" vs "search/filter matched nothing" when useful.
10. Page sizes are 10/25/50/75/100 (`ADMIN_PAGE_SIZES` now matches `ListPagination`); cards load 100 per batch.
11. Hidden data: super admin accounts never appear in `/admin/members` (API hides them); there is no role filter any more (the members page filters by `seller=true|false` and status).
12. Tests: mock `@/hooks/use-is-narrow-content` to `false`, use `new QueryClient({ defaultOptions: { queries: { retry: false } } })` to test error states, open row actions with `getByRole('button', { name: 'Actions for <name>' })` then `menuitem`.

## Taken from the Unikorn reference app

Page skeleton and order, one-row wrapping `PageHeader` (`text-xl` then `@lg/content:text-2xl`, not sticky), `ListToolbar` (tabs left, search `max-w-md` + counted Filters button right, collapsible panel with Clear filters, scrolling tabs on narrow), `RowActionsMenu` (ghost kebab, `modal={false}`), table in a Card with `ListPagination`, cards + infinite scroll narrow, `EmptyState`, container queries.

## Differences

- Filters live in URL search params (reference uses local state); the Filters panel starts open when a URL filter is set.
- Added an error state with "Try again" in `AdminList` (reference has none).
- Desktop empty state renders without a Card around it (no dashed box nested in a bordered Card).
- No `StatStrip`, no sort control: bids-app list pages carry no figures; add only if a page truly needs them.
- Tab counts ("All (12)") are not used yet: the members API returns `stats` that `parseMemberPage` drops; wire it up first if a page wants counts.
