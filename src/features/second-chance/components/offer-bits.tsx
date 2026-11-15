'use client';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useServerNow } from '@/components/common/countdown';
import { cn } from '@/lib/utils';
import type { OfferStatus } from '../second-chance.types';

const VARIANT: Record<OfferStatus, 'warning' | 'success' | 'secondary' | 'outline'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'secondary',
  EXPIRED: 'outline',
};
const LABEL: Record<OfferStatus, string> = { PENDING: 'Pending', ACCEPTED: 'Accepted', DECLINED: 'Declined', EXPIRED: 'Expired' };

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return (
    <Badge variant={VARIANT[status]} dot>
      {LABEL[status]}
    </Badge>
  );
}

/** Milliseconds left until `expiresAt` on the server clock; null before mount (stable SSR markup). */
export function useOfferRemainingMs(expiresAt: string): number | null {
  const now = useServerNow();
  if (now === 0) return null;
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

export function formatRemaining(ms: number) {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

/** "Expires in 1d 3h 20m"; "Expired" once the time is up. */
export function OfferCountdown({ expiresAt, className }: { expiresAt: string; className?: string }) {
  const ms = useOfferRemainingMs(expiresAt);
  if (ms === null) return <span className={cn('text-xs', className)}>&nbsp;</span>;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium tabular-nums', ms < 3_600_000 ? 'text-destructive' : 'text-muted-foreground', className)}>
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {ms === 0 ? 'Expired' : `Expires in ${formatRemaining(ms)}`}
    </span>
  );
}
