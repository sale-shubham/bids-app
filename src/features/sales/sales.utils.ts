import type { SaleDTO, SaleStatus } from './sales.types';

export const SALE_STATUS_LABEL: Record<SaleStatus, string> = {
  AWAITING_PAYMENT: 'Awaiting payment',
  PAID: 'Paid',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  RELEASED: 'Completed',
  DISPUTED: 'Disputed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

export const SALE_TABS: { value: SaleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'AWAITING_PAYMENT', label: 'Awaiting payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'RELEASED', label: 'Completed' },
  { value: 'DISPUTED', label: 'Disputed' },
];

const SETTLEABLE: SaleStatus[] = ['PAID', 'SHIPPED', 'DELIVERED', 'DISPUTED'];
const ADMIN_RELEASABLE: SaleStatus[] = ['DELIVERED', 'DISPUTED'];

export interface SaleActions {
  /** Buyer can still pay (inside the pay-by window). */
  canPay: boolean;
  /** Buyer is awaiting payment but the window has closed. */
  payWindowClosed: boolean;
  canConfirm: boolean;
  canDispute: boolean;
  canShip: boolean;
  /** Admin only. */
  canRelease: boolean;
  canRefund: boolean;
}

/** Which actions the viewer can take on a sale, by role and status. `now` is injectable for tests. */
export function saleActions(sale: Pick<SaleDTO, 'status' | 'role' | 'payBy'>, now = Date.now()): SaleActions {
  const buyer = sale.role === 'BUYER';
  const awaiting = sale.status === 'AWAITING_PAYMENT';
  const open = !sale.payBy || Date.parse(sale.payBy) > now;
  return {
    canPay: buyer && awaiting && open,
    payWindowClosed: buyer && awaiting && !open,
    canConfirm: buyer && (sale.status === 'PAID' || sale.status === 'SHIPPED'),
    canDispute: buyer && (sale.status === 'PAID' || sale.status === 'SHIPPED' || sale.status === 'DELIVERED'),
    canShip: sale.role === 'SELLER' && sale.status === 'PAID',
    canRelease: sale.role === 'ADMIN' && ADMIN_RELEASABLE.includes(sale.status),
    canRefund: sale.role === 'ADMIN' && SETTLEABLE.includes(sale.status),
  };
}

export interface TimelineStep {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
}

/** Ordered lifecycle steps for the detail page; steps not reached yet are `done: false` (omitted once the sale is terminal). */
export function saleTimeline(sale: SaleDTO): TimelineStep[] {
  const steps: TimelineStep[] = [
    { key: 'created', label: 'Auction won', at: sale.createdAt || null, done: true },
    { key: 'paid', label: 'Payment received', at: sale.paidAt, done: !!sale.paidAt },
    {
      key: 'shipped',
      label: sale.shippingMethod === 'PICKUP' ? 'Ready for pickup' : 'Shipped',
      at: sale.shippedAt,
      done: !!sale.shippedAt,
    },
    { key: 'delivered', label: 'Delivered', at: sale.deliveredAt, done: !!sale.deliveredAt },
    { key: 'released', label: 'Payment released to seller', at: sale.releasedAt, done: !!sale.releasedAt },
  ];
  const terminal = sale.status === 'REFUNDED' || sale.status === 'CANCELLED' || sale.status === 'RELEASED';
  const out = terminal ? steps.filter((s) => s.done) : [...steps];
  if (sale.disputedAt) out.push({ key: 'disputed', label: 'Problem reported', at: sale.disputedAt, done: true });
  if (sale.refundedAt) out.push({ key: 'refunded', label: 'Refunded to buyer', at: sale.refundedAt, done: true });
  if (sale.cancelledAt) out.push({ key: 'cancelled', label: 'Cancelled', at: sale.cancelledAt, done: true });
  return out;
}
