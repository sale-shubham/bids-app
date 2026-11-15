export type SaleStatus =
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RELEASED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'CANCELLED';

export type SaleRole = 'BUYER' | 'SELLER' | 'ADMIN';
export type ShippingMethod = 'COURIER' | 'PICKUP';
/** `role` query param of GET /sales/mine. */
export type SaleListRole = 'buyer' | 'seller';

export interface SaleContact {
  name: string;
  email: string;
  phone: string;
}

export interface SaleDTO {
  id: string;
  auctionId: string;
  auction: { id: string; title: string; coverImage: string | null };
  status: SaleStatus;
  itemPaise: number;
  shippingFeePaise: number;
  amountPaise: number;
  payBy: string | null;
  paidAt: string | null;
  shippingMethod: ShippingMethod | null;
  courier: string | null;
  trackingNo: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  releasedAt: string | null;
  disputedAt: string | null;
  disputeReason: string | null;
  refundedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  role: SaleRole;
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  /** Seller / admin only. */
  commissionPaise?: number;
  payoutPaise?: number;
  /** Seller only, once paid. */
  buyerContact?: SaleContact;
  /** Buyer only, once paid. */
  sellerContact?: SaleContact;
}

/** The small `sale` summary on the auction detail (buyer / seller / admin only). */
export interface AuctionSaleSummary {
  id: string;
  status: SaleStatus;
  payBy: string | null;
}

export interface ShipSaleInput {
  method: ShippingMethod;
  courier?: string;
  trackingNo?: string;
}

export const SALE_STATUSES: SaleStatus[] = [
  'AWAITING_PAYMENT',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'RELEASED',
  'DISPUTED',
  'REFUNDED',
  'CANCELLED',
];
