import type { OfferDTO } from '@/features/second-chance/second-chance.types';
import type { ShippingOptions } from '@/features/auctions/auctions.types';

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
  /** Reflects the buyer's delivery choice once checkout has started. */
  shippingFeePaise: number;
  amountPaise: number;
  /** The buyer's pick when the auction offers both pickup and courier; null until chosen. */
  deliveryChoice?: ShippingMethod | null;
  /** What the auction offers (null on legacy sales). */
  shippingOptions?: ShippingOptions | null;
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
  /** Seller view of a CANCELLED sale: the second-chance offer made to the runner-up, if any. */
  secondChanceOffer?: OfferDTO | null;
  /** Seller view: the sale is CANCELLED and no offer exists yet. */
  canOfferSecondChance?: boolean;
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
