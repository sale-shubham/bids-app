# CRUD_PATTERN.md — Page & Form Standard

Every feature that manages a resource follows this anatomy consistently.

---

## List page anatomy

```
/member/listings                 ← list page
  ├── Header row                 ← title + action, the shared container row (below)
  ├── Search bar                 ← controlled input → ?q= to server
  ├── Filter controls (optional) ← category, status, etc.
  ├── Table or card grid         ← <ResponsiveList>, queries gated by useIsNarrowContent()
  ├── Empty state                ← <EmptyState> when data.length === 0
  ├── Pagination                 ← <Pagination> with total/page/pageSize
  └── Action buttons (delete)    ← always via <ConfirmDialog>
```

The header row and every filter row are container-query rows, never a bare
`flex items-center justify-between`:

```tsx
<div className="flex flex-col gap-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">My Listings</h1>
    <p className="text-muted-foreground">Manage your product listings.</p>
  </div>
  <Button asChild>…</Button>
</div>
```

Admin and member screens use the same row. Controls inside a filter row are
`w-full @lg/content:w-<n>`. See `docs/CONTAINER_QUERIES.md`.

## Create route

```
/member/listings/new             ← dedicated page with form
```

## Edit route

```
/member/listings/[id]/edit       ← dedicated page with pre-filled form
```

---

## Form pattern

```tsx
// src/features/listings/listing-form.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { listingSchema, type ListingSchema } from './listings.schema';

export function ListingForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<ListingSchema>({
    resolver: zodResolver(listingSchema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* fields */}
    </form>
  );
}
```

Schema lives in `src/features/<feature>/<feature>.schema.ts`:

```ts
// src/features/listings/listings.schema.ts
import { z } from '@/lib/zod'; // never from 'zod' directly — readme/methods/zod-validation.md

export const listingSchema = z.object({
  title: z.string().min(3),
  price: z.number().positive(),
  // ...
});

export type ListingSchema = z.infer<typeof listingSchema>;
```

---

## API + mutation pattern

```tsx
// src/features/listings/use-listings.ts
export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ListingSchema) => api.post('/listings', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listings'] });
      toast.success('Listing created');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
}
```

---

## Admin CRUD

Same pattern but under `src/app/(admin)/admin/<resource>/`. Admin tables use `pageSize: 50` and include status badges + bulk action controls.

---

## Checklist for new CRUD feature

- [ ] `src/features/<feature>/<feature>.api.ts` — API calls
- [ ] `src/features/<feature>/use-<feature>.ts` — react-query hooks
- [ ] `src/features/<feature>/<feature>.schema.ts` — zod schema
- [ ] List page with search + pagination + `<EmptyState>`
- [ ] `/new` route with form
- [ ] `/[id]/edit` route with pre-filled form
- [ ] Delete action via `<ConfirmDialog>`
- [ ] `readme/flows/<feature>.md` created and registered in `CLAUDE.md`
- [ ] Row added to `docs/CONFIRM_DIALOG.md` for delete action
