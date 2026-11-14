import type { AuctionCard, AuctionDetail } from '@/features/auctions/auctions.types';

/** One bid as the API shows it: bidder identity is masked, `isMe` marks the caller's own. */
export interface BidDTO {
  id: string;
  amountPaise: number;
  createdAt: string;
  /** Masked label, e.g. "R***h". */
  bidderLabel: string;
  isMe: boolean;
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
  bid: BidDTO;
  serverTime: string | null;
}

export type MyBidsTab = 'winning' | 'outbid' | 'won' | 'lost';
export type MyBidState = 'WINNING' | 'OUTBID' | 'WON' | 'LOST';

export interface MyBidRow {
  auction: AuctionCard;
  myHighestBidPaise: number;
  myBidCount: number;
  lastBidAt: string;
  state: MyBidState;
}
