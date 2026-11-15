import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { SaleStatus } from '../sales.types';
import { SaleStatusBadge } from './sale-status-badge';

/**
 * Winner's entry point into checkout: "Pay now" while the sale awaits payment (plus the pay-by date when
 * known), otherwise the sale status and a "View purchase" link. Used by the auction result and /my-bids.
 */
export function BuyerSaleEntry({ saleId, status, payBy }: { saleId: string; status: SaleStatus | string; payBy?: string | null }) {
  const href = `/purchases/${saleId}`;
  if (status === 'AWAITING_PAYMENT') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href={href}>Pay now</Link>
        </Button>
        {payBy && <span className="text-xs text-muted-foreground">Pay by {formatDate(payBy)}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SaleStatusBadge status={status} />
      <Button asChild variant="outline" size="sm">
        <Link href={href}>View purchase</Link>
      </Button>
    </div>
  );
}
