# CRUD_PATTERN.md — Page & Form Standard

Every feature that manages a resource follows this anatomy. The reference implementation is the
seller's auctions (`/sell/*`, `src/features/auctions/`); the admin lists follow the same shape with
a table (see Admin CRUD).

---

## List page anatomy

```
/sell/auctions                   ← list page (src/app/(auctioneer)/sell/auctions/page.tsx)
  ├── Header row                 ← title + "New auction" button, the shared container row (below)
  ├── Filter controls            ← status <Tabs> (Upcoming / Live / Ended / Cancelled) → server param
  ├── Rows or cards              ← flattened useInfiniteQuery pages
  ├── Empty state                ← <EmptyState> when there are no items
  ├── Paging                     ← <InfiniteScroll> sentinel (docs/PAGINATION.md)
  └── Row actions                ← Edit link; Delete always via <ConfirmDialog>
```

The header row and every filter row are container-query rows, never a bare
`flex items-center justify-between`:

```tsx
<div className="flex flex-col gap-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">My auctions</h1>
    <p className="text-muted-foreground">Create and manage your auctions.</p>
  </div>
  <Button asChild>
    <Link href="/sell/new"><Plus className="h-4 w-4" /> New auction</Link>
  </Button>
</div>
```

Admin pages get the same row from the common `PageHeader` (`src/components/common/page-header.tsx`).
Controls inside a filter row are `w-full @lg/content:w-<n>`. See `docs/CONTAINER_QUERIES.md`.

## Create route

```
/sell/new                        ← dedicated page with the form
```

## Edit route

```
/sell/auctions/[id]/edit         ← dedicated page with the pre-filled form
```

Create and edit share one component, `AuctionForm` (`src/features/auctions/components/auction-form.tsx`):
`<AuctionForm />` creates, `<AuctionForm auction={auction} />` edits. The edit page checks
ownership and editability (no bids yet, not ended or cancelled) and shows a notice instead of the
form when either fails. A detail page per record (`/sell/auctions/[id]`) is optional; the auctions
one shows the bid history and result.

---

## Form pattern

```tsx
// src/features/auctions/components/auction-form.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { defaultFormValues, makeAuctionFormSchema, toWritePayload, type AuctionFormValues } from '../auctions.schema';

export function AuctionForm({ auction }: { auction?: AuctionDetail }) {
  const create = useCreateAuction();
  const update = useUpdateAuction(auction?.id ?? '');
  const defaults = React.useMemo(() => defaultFormValues(auction), [auction]);
  const schema = React.useMemo(() => makeAuctionFormSchema(auction?.startTime), [auction?.startTime]);
  const form = useForm<AuctionFormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  const onSubmit = (values: AuctionFormValues) => {
    const payload = toWritePayload(values); // rupee strings -> paise, date + time -> ISO
    create.mutate(payload, {
      onSuccess: (a) => {
        toast.success('Auction created');
        router.push(`/auctions/${a.id}`);
      },
      onError: (e) => toast.error(auctionErrorMessage(e, 'Could not save the auction')),
    });
    // edit mode: build a diff against defaultFormValues(auction) and update.mutate(diff, …)
  };

  return <form onSubmit={form.handleSubmit(onSubmit)} noValidate>{/* fields */}</form>;
}
```

Schema lives in `src/features/<feature>/<feature>.schema.ts`:

```ts
// src/features/auctions/auctions.schema.ts
import { z } from '@/lib/zod'; // never from 'zod' directly — readme/methods/zod-validation.md

export function makeAuctionFormSchema(originalStart?: string) {
  return z
    .object({
      title: z.string().trim().min(5, 'At least 5 characters').max(120, 'At most 120 characters'),
      images: z.array(z.string()).min(1, 'Add at least one image').max(8, 'At most 8 images'),
      // ...
    })
    .superRefine((v, ctx) => {
      // cross-field rules: start not in the past, runs 1 hour to 30 days
    });
}
```

A static schema exports the object itself (`profileSchema`, `changePasswordSchema`); a factory like
the one above is for rules that depend on the record being edited. Money is entered in rupees and
sent in paise (`rupeesToPaise`).

---

## API + mutation pattern

API calls live in `src/features/<feature>/<feature>.api.ts` and go through `api`
(`src/lib/api-client.ts`); hooks in `use-<feature>.ts` wrap them and invalidate the cache.
Toasts and navigation stay at the call site, so one hook serves several screens:

```tsx
// src/features/auctions/use-auctions.ts
function useInvalidateAuctions() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: ['auctions'] });
    if (id) void qc.invalidateQueries({ queryKey: ['auction', id] });
  };
}

export function useCreateAuction() {
  const invalidate = useInvalidateAuctions();
  return useMutation({ mutationFn: (input: AuctionWritePayload) => api.createAuction(input), onSuccess: () => invalidate() });
}
```

Every list key starts with the feature's prefix (`['auctions', filters]`, `['auctions', 'mine', status]`),
so one `invalidateQueries({ queryKey: ['auctions'] })` refreshes them all.

---

## Admin CRUD

Same pattern under `src/app/(admin)/admin/<resource>/` (members, auctions, commissions, payments):

- Filters live in the URL through `useUrlState(defaults)` (`src/features/admin/use-url-state.ts`):
  changing a filter resets `page` to 1, and `page` / `pageSize` are read from the URL too
  (`ADMIN_PAGE_SIZES` = 10, 25, 50; default 10).
- The list is `useAdminList()` (`src/features/admin/use-admin.ts`) rendered by `<AdminList>`: a table
  with numbered pages on a wide content area, cards with infinite scroll on a narrow one, plus a
  shared error state (`docs/PAGINATION.md`).
- Status columns use `<StatusBadge>`; row actions (cancel an auction, deactivate a member, change a
  role, waive a commission) go through `<ConfirmDialog>`. There are no bulk actions.
- Mutations invalidate `['admin']`, plus the public prefix they affect (`['auctions']`, `['commissions']`).

---

## Checklist for new CRUD feature

- [ ] `src/features/<feature>/<feature>.api.ts` — API calls through `api`
- [ ] `src/features/<feature>/use-<feature>.ts` — react-query hooks, one key prefix per feature
- [ ] `src/features/<feature>/<feature>.schema.ts` — zod schema (`z` from `@/lib/zod`)
- [ ] List page with filters, `<EmptyState>` and paging (`<InfiniteScroll>`, or `<ResponsiveList>` for a table)
- [ ] Create route with the form
- [ ] Edit route with the pre-filled form (or one shared form component for both)
- [ ] Delete action via `<ConfirmDialog>`
- [ ] `readme/flows/<feature>.md` created and registered in `CLAUDE.md`
- [ ] Row added to `docs/CONFIRM_DIALOG.md` for every confirmable action
