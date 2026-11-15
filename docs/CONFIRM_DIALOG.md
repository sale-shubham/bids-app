# CONFIRM_DIALOG.md — Confirmation Dialog Standard

Every destructive, irreversible, or consequential action MUST use `<ConfirmDialog>` from `src/components/common/confirm-dialog.tsx`.

**No exceptions.** No `window.confirm`, no inline `<AlertDialog>` for confirms, no direct mutation on click.

---

## Component

```tsx
import { ConfirmDialog } from '@/components/common/confirm-dialog';
```

Props: `open`, `onOpenChange`, `title`, `description?`, `confirmLabel?` (default `'Confirm'`), `variant?` (`'default' | 'destructive'`), `loading?`, `onConfirm`, `children?` (extra content between the description and the buttons, e.g. the admin role picker). Cancel is always an outline "Cancel" button.

---

## When to use

| Action | Confirm required |
|---|---|
| Place a bid | Yes (bids cannot be withdrawn) |
| Delete an auction (owner) | Yes |
| Cancel an auction (admin) | Yes |
| Activate / deactivate a member (admin) | Yes |
| Change a member's role (admin) | Yes |
| Waive a commission (admin) | Yes |
| Log out (this device, or all devices) | Yes |
| Remove a signed-in device | Yes |
| Pay a commission | Razorpay Checkout is the confirmation step; in stub mode (`keyId` = `"stub"`) a `ConfirmDialog` asks before simulating the payment |

**Does NOT require confirm:** read-only actions, reversible toggles (watchlist heart, notification switch, theme), marking notifications read, navigation.

---

## Implementation pattern (5 steps)

```tsx
// 1. State: the record waiting for confirmation
const del = useDeleteAuction();
const [toDelete, setToDelete] = React.useState<AuctionCard | null>(null);

// 2. Click opens the dialog — NEVER call the mutation directly
<Button variant="outline" size="sm" className="text-destructive" onClick={() => setToDelete(a)}>
  <Trash2 className="h-4 w-4" /> Delete
</Button>

// 3. Confirm handler runs the mutation, toasts, and closes the dialog
const confirmDelete = () => {
  if (!toDelete) return;
  del.mutate(toDelete.id, {
    onSuccess: () => {
      toast.success('Auction deleted');
      setToDelete(null);
    },
    onError: (e) => {
      toast.error(auctionErrorMessage(e, 'Could not delete the auction'));
      setToDelete(null);
    },
  });
};

// 4. Dialog at component top level (NOT inside each row or card)
return (
  <>
    {/* ... list ... */}

    {/* 5. One dialog for the whole list, driven by the state */}
    <ConfirmDialog
      open={!!toDelete}
      onOpenChange={(o) => !o && setToDelete(null)}
      title="Delete this auction?"
      description={toDelete ? `"${toDelete.title}" will be removed. This cannot be undone.` : undefined}
      confirmLabel="Delete"
      variant="destructive"
      loading={del.isPending}
      onConfirm={confirmDelete}
    />
  </>
);
```

`loading` can come straight from the mutation (`isPending`) or from a local flag around `mutateAsync` in `try/finally` (`DashboardShell`'s and `MorePage`'s Logout do the latter). Error messages go through `apiErrorMessage(err)` or the feature's wrapper around it (`auctionErrorMessage`).

---

## Copy guidelines

- **Title:** a short question or verb phrase: "Delete this auction?", "Cancel this auction?", "Waive this commission?", "Deactivate this member?", "Confirm your bid", "Remove Device"
- **Description:** name the specific record and the consequence: the auction title, the member's email, the amount (`"You are about to bid ₹1,500 on "…". Bids cannot be withdrawn."`)
- **Confirm label:** match the verb: "Delete", "Cancel auction", "Waive commission", "Deactivate", "Bid ₹1,500"
- **Cancel label:** "Cancel" (built in)
- **Variant:** `"destructive"` for deletes, cancellations, waivers, deactivation, logout and device removal; default for placing a bid, activating a member and other non-destructive confirms

---

## Banned patterns

```tsx
// ❌ NEVER
onClick={() => del.mutate(auction.id)}
onClick={() => logout.mutate()}
window.confirm('Are you sure?')

// ✓ ALWAYS
onClick={() => setToDelete(auction)}
// then ConfirmDialog handles the rest
```

---

## Live reference files

| File | Action confirmed |
|---|---|
| `src/features/bids/components/bid-panel.tsx` | Place a bid ("Confirm your bid", confirm label shows the amount) |
| `src/app/(auctioneer)/sell/auctions/page.tsx` | Delete auction (row action on My auctions) |
| `src/app/(auctioneer)/sell/auctions/[id]/page.tsx` | Delete auction (seller's auction page) |
| `src/features/auctions/components/auction-detail.tsx` | Delete auction (owner only, from the public detail page) |
| `src/app/(auctioneer)/sell/commissions/page.tsx` | Simulate a commission payment in Razorpay stub mode ("Test mode") |
| `src/app/(admin)/admin/auctions/page.tsx` | Cancel auction (admin, destructive) |
| `src/app/(admin)/admin/members/page.tsx` | Activate / deactivate member (destructive when deactivating); change role (destructive when granting `SUPER_ADMIN`, with the role `Select` as `children`) |
| `src/app/(admin)/admin/commissions/page.tsx` | Waive commission (destructive, "This cannot be undone") |
| `src/components/layout/dashboard-shell.tsx` | Logout (sidebar footer button) |
| `src/components/layout/user-menu.tsx` | Log out (header account menu) |
| `src/components/layout/more-page.tsx` | Logout (Profile page, App tab) |
| `src/components/common/sign-out-card.tsx` | Log out / Log out of all devices (Profile page, Security tab) |
| `src/components/common/my-devices-card.tsx` | Remove device (Profile page, Security tab) |

---

## Pre-PR grep audit

```bash
grep -rn "window\.confirm" src/      # must be 0
grep -rln "<ConfirmDialog" src/      # every file listed here must be in the table above
```
