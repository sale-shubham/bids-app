# CONFIRM_DIALOG.md — Confirmation Dialog Standard

Every destructive, irreversible, or consequential action MUST use `<ConfirmDialog>` from `src/components/common/confirm-dialog.tsx`.

**No exceptions.** No `window.confirm`, no inline `<AlertDialog>` for confirms, no direct mutation on click.

---

## Component

```tsx
import { ConfirmDialog } from '@/components/common/confirm-dialog';
```

---

## When to use

| Action | Confirm required |
|---|---|
| Delete a listing | Yes |
| Subscribe to / purchase a plan | Yes |
| Deactivate/ban a member (admin) | Yes |
| Remove a product (admin) | Yes |
| Reject/archive a listing (admin) | Yes (if irreversible) |
| Approve a listing (admin) | Only if irreversible |
| Logout | Yes |
| Prompt to upgrade plan (viewer lacks a required feature) | Yes (informational, not destructive — still consequential/navigational) |
| Bulk delete / bulk action | Yes |
| Cancel subscription | Yes |

**Does NOT require confirm:** read-only actions, reversible status changes, navigation.

---

## Implementation pattern (5 steps)

```tsx
// 1. State pair
const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
const [isDeletingListing, setIsDeletingListing] = useState(false);

// 2. Click opens dialog — NEVER call mutation directly
const handleDeleteClick = (listing: Listing) => {
  setListingToDelete(listing);
};

// 3. Async confirm handler runs mutation in try/finally
const confirmDeleteListing = async () => {
  if (!listingToDelete) return;
  setIsDeletingListing(true);
  try {
    await deleteMutation.mutateAsync(listingToDelete.id);
    toast.success('Listing deleted');
    setListingToDelete(null);
  } catch (err) {
    toast.error(apiErrorMessage(err));
  } finally {
    setIsDeletingListing(false);
  }
};

// 4. In JSX — dialog at component top level (NOT nested inside table rows)
return (
  <>
    {/* ... rest of component ... */}

    {/* 5. Dialog mounted at top level */}
    <ConfirmDialog
      open={!!listingToDelete}
      onOpenChange={(open) => !open && setListingToDelete(null)}
      title="Delete Listing"
      description={`Are you sure you want to delete "${listingToDelete?.title}"? This cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={confirmDeleteListing}
      loading={isDeletingListing}
      variant="destructive"
    />
  </>
);
```

---

## Copy guidelines

- **Title:** verb-noun — "Delete Listing", "Withdraw Funds", "Deactivate Member"
- **Description:** name the specific record — `"${listing.title}"`, `"${member.name}"`
- **Confirm label:** match the verb — "Delete", "Withdraw", "Deactivate"
- **Cancel label:** "Cancel" (default)
- **Variant:** `"destructive"` for deletes/irreversible; default otherwise

---

## Banned patterns

```tsx
// ❌ NEVER
onClick={() => deleteListing(id)}
onClick={logout}
window.confirm('Are you sure?')

// ✓ ALWAYS
onClick={() => setListingToDelete(listing)}
// then ConfirmDialog handles the rest
```

---

## Live reference files

| File | Action confirmed |
|---|---|
| `src/app/(admin)/admin/listings/page.tsx` | Reject listing (remark); Pause listing; Delete listing (soft, admin); Delete listing permanently (hard, admin) |
| `src/components/layout/dashboard-shell.tsx` | Logout (sidebar footer button) |
| `src/components/layout/more-page.tsx` | Logout (Profile page, App tab) |
| `src/components/common/my-devices-card.tsx` | Remove device (Profile page, Devices tab) |
| `src/app/(member)/plans/page.tsx` | Subscribe/purchase a plan (charge); Cancel subscription (destructive) |
| `src/app/(member)/search/page.tsx` | Upgrade plan prompt (viewer's plan lacks `FEATURE_KEYS.VIEW_SUPPLIER_CONTACT`) — links to `/plans` |
| `src/app/(member)/businesses/[id]/page.tsx` | Delete business (soft, owner) |
| `src/app/(admin)/admin/businesses/page.tsx` | Delete business (soft, admin); Delete business permanently (hard, admin) |
| `src/app/(admin)/admin/members/page.tsx` | Delete member (soft, admin); Delete member permanently (hard, admin) |
| `src/app/(member)/listings/page.tsx` | Delete listing (soft, owner); Delete listing permanently (hard, owner) |
| `src/app/(admin)/admin/breach-incidents/page.tsx` | Record Board notification (required method); Record principal notification (required method); Close incident (destructive, append-only after) |
| `src/app/(member)/inquiries/page.tsx` | Close inquiry (owner, "Close inquiry?" / "Close inquiry"); Delete inquiry (soft, owner, destructive) — row actions on My Inquiries. Reopen runs directly, no dialog |
| `src/features/inquiries/inquiry-detail-dialog.tsx` | Close inquiry (owner); Delete inquiry (soft, owner, destructive, closes the detail dialog); Upgrade plan prompt on "View buyer details" (viewer's plan lacks `FEATURE_KEYS.VIEW_SUPPLIER_CONTACT`) — "Upgrade Your Plan" / "View Plans", links to `/plans` |
| `src/app/(admin)/admin/inquiries/page.tsx` | Close inquiry (admin; the owner can reopen it); Delete inquiry (soft, admin, destructive) |

---

## Pre-PR grep audit

```bash
grep -rn "window\.confirm" src/   # must be 0
```
