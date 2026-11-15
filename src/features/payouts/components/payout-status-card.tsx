import { Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { PayoutAccount, PayoutStatus } from '../payouts.types';

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive';

export const PAYOUT_STATUS_INFO: Record<PayoutStatus, { label: string; variant: Variant; explanation: string }> = {
  PENDING: {
    label: 'Pending verification',
    variant: 'warning',
    explanation: 'We are verifying your details with our payment partner. This usually takes a short while. You can receive payouts once it is active.',
  },
  NEEDS_CLARIFICATION: {
    label: 'More information needed',
    variant: 'warning',
    explanation: 'Our payment partner needs more information to verify your account. Check your email for what to send, or contact support.',
  },
  ACTIVE: {
    label: 'Active',
    variant: 'success',
    explanation: 'You are all set. Payments from buyers are paid out to this bank account after the buyer confirms delivery.',
  },
  SUSPENDED: {
    label: 'Suspended',
    variant: 'destructive',
    explanation: 'Payouts to this account are paused. Contact support to find out why and how to restore it.',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    explanation: 'Your details could not be verified. Check them and submit again below.',
  },
};

/** Shows the account status, why, and only the last 4 digits of the bank account (never the full number). */
export function PayoutStatusCard({ account }: { account: PayoutAccount }) {
  const info = PAYOUT_STATUS_INFO[account.status];
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Landmark className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold">Payout account</h2>
          <Badge variant={info.variant} dot>
            {info.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{info.explanation}</p>
        {account.statusReason && (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason</span>
            {account.statusReason}
          </p>
        )}
        <dl className="grid gap-3 text-sm @lg/content:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Account holder</dt>
            <dd className="font-medium">{account.beneficiaryName ?? account.legalName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Bank account</dt>
            <dd className="font-medium tnum">{account.bankLast4 ? `•••• ${account.bankLast4}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">IFSC</dt>
            <dd className="font-medium">{account.ifsc ?? '—'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
