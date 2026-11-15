import type { AuctionCard, AuctionDetail } from '@/features/auctions/auctions.types';
import type { SaleStatus } from '@/features/sales/sales.types';

export type BidKind = 'MANUAL' | 'AUTO' | 'BUY_NOW';

/** One bid as the API shows it: bidder identity is masked, `isMe` marks the caller's own. */
export interface BidDTO {
  id: string;
  amountPaise: number;
  createdAt: string;
  /** Masked label, e.g. "R***h". */
  bidderLabel: string;
  isMe: boolean;
  /** AUTO = placed by the proxy for a bidder's maximum; BUY_NOW = the closing buy-now purchase. */
  kind: BidKind;
}

/** Counterparty contact, only sent after an auction ended with a winner. `role` is the OTHER party's role. */
export interface AuctionContact {
  role: 'SELLER' | 'WINNER';
  name: string;
  email: string;
  phone: string;
}

export interface PlaceBidResult {
  auction: AuctionDetail;
  bid: BidDTO | null;
  serverTime: string | null;
  /** True when another bidder's maximum was higher, so the requester is not leading. */
  outbidByProxy: boolean;
}

export interface BuyNowResult {
  auction: AuctionDetail;
  serverTime: string | null;
}

export type MyBidsTab = 'winning' | 'outbid' | 'won' | 'lost';
export type MyBidState = 'WINNING' | 'OUTBID' | 'WON' | 'LOST';

export interface MyBidRow {
  auction: AuctionCard;
  myHighestBidPaise: number;
  /** The viewer's own maximum bid on this auction. */
  myMaxBidPaise: number | null;
  myBidCount: number;
  lastBidAt: string;
  state: MyBidState;
  /** Won and not rated yet. */
  canReview?: boolean;
  /** The checkout sale of a won auction (null for legacy auctions without one). */
  saleId?: string | null;
  saleStatus?: SaleStatus | null;
}
