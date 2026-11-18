import { Badge } from '@/components/ui/badge';

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

const MAP: Record<string, { label: string; variant: Variant }> = {
  // member / listing lifecycle
  DRAFT: { label: 'Draft', variant: 'secondary' },
  APPROVED: { label: 'Approved', variant: 'success' },
  VERIFIED: { label: 'Verified', variant: 'success' },
  ACTIVE: { label: 'Active', variant: 'success' },
  // Business/BusinessMember/Member.isActive: false, pages substitute this
  // literal string in place of the real status — was falling through to the
  // generic outline fallback (raw "INACTIVE" text) before this entry existed.
  // Label "Suspended" (2026-09-12, was "Paused") — matches the terminology
  // used everywhere else for this isActive:false state (ACCOUNT_SUSPENDED,
  // the admin Suspend button, the /suspended page); "Paused" is reserved for
  // an actual Listing.status of PAUSED, a different, real status value.
  INACTIVE: { label: 'Suspended', variant: 'secondary' },
  PENDING: { label: 'Pending', variant: 'warning' },
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  EXPIRED: { label: 'Expired', variant: 'destructive' },
  PAUSED: { label: 'Paused', variant: 'secondary' },
  // Listing.status only (2026-09-12) — cascade-only, set when the owning
  // Business/Member gets suspended (never a direct owner/admin pause action
  // on the listing itself, that's PAUSED above). destructive, not secondary,
  // since it signals something happened one level up, not the owner's own
  // choice.
  SUSPENDED: { label: 'Suspended', variant: 'destructive' },
  DELETED: { label: 'Deleted', variant: 'destructive' },
  // payments / subscriptions
  PAID: { label: 'Paid', variant: 'success' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  // commissions (DUE / PAID / WAIVED) and sales (CREATED until paid)
  DUE: { label: 'Due', variant: 'warning' },
  WAIVED: { label: 'Waived', variant: 'secondary' },
  CREATED: { label: 'Created', variant: 'secondary' },
  // watchlist match alerts — shares FAILED above with payments.
  SENT: { label: 'Sent', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' },
  // breach incidents — case status + severity
  OPEN: { label: 'Open', variant: 'warning' },
  INVESTIGATING: { label: 'Investigating', variant: 'warning' },
  CONTAINED: { label: 'Contained', variant: 'secondary' },
  CLOSED: { label: 'Closed', variant: 'success' },
  LOW: { label: 'Low', variant: 'secondary' },
  MEDIUM: { label: 'Medium', variant: 'warning' },
  HIGH: { label: 'High', variant: 'destructive' },
  CRITICAL: { label: 'Critical', variant: 'destructive' },
};

export function StatusBadge({ status, dot = true, className }: { status: string; dot?: boolean; className?: string }) {
  const cfg = MAP[status] ?? { label: status, variant: 'outline' as Variant };
  return <Badge variant={cfg.variant} dot={dot} className={className}>{cfg.label}</Badge>;
}
