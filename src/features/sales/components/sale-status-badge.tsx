import { Badge } from '@/components/ui/badge';
import { SALE_STATUS_LABEL } from '../sales.utils';
import type { SaleStatus } from '../sales.types';

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

const VARIANT: Record<SaleStatus, Variant> = {
  AWAITING_PAYMENT: 'warning',
  PAID: 'success',
  SHIPPED: 'default',
  DELIVERED: 'success',
  RELEASED: 'success',
  DISPUTED: 'destructive',
  REFUNDED: 'secondary',
  CANCELLED: 'secondary',
};

/** Sale lifecycle badge (own map: PAID / CANCELLED mean something different in the shared StatusBadge). */
export function SaleStatusBadge({ status, className }: { status: string; className?: string }) {
  const known = status in VARIANT;
  return (
    <Badge variant={known ? VARIANT[status as SaleStatus] : 'outline'} dot className={className}>
      {known ? SALE_STATUS_LABEL[status as SaleStatus] : status}
    </Badge>
  );
}
