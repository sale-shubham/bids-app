import type { AuctionContact, BidDTO } from '@/features/bids/bids.types';

export type AuctionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type AuctionCondition = 'NEW' | 'USED';
export type AuctionSort = 'endingSoon' | 'newest' | 'priceAsc' | 'priceDesc' | 'mostBids';
/** Public browse tabs (`GET /auctions?status=`). */
export type BrowseStatus = 'live' | 'upcoming' | 'ended';
/** Seller tabs (`GET /auctions/mine?status=`). */
export type MineStatus = 'upcoming' | 'live' | 'ended' | 'cancelled';

export interface AuctionSeller {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuctionCard {
  id: string;
  title: string;
  category: string;
  condition: AuctionCondition;
  coverImage: string | null;
  startingBidPaise: number;
  currentBidPaise: number;
  bidCount: number;
  startTime: string;
  endTime: string;
  status: AuctionStatus;
  seller: AuctionSeller;
  /** Buy It Now price; null when not set or once any bid exists. */
  buyNowPricePaise: number | null;
  hasReserve: boolean;
  reserveMet: boolean;
}

export interface AuctionDetail extends AuctionCard {
  /** Sanitised HTML. */
  description: string;
  images: string[];
  minIncrementPaise: number;
  highestBidderId: string | null;
  winnerId: string | null;
  endedAt: string | null;
  /** Signed-in caller only. */
  isWatching?: boolean;
  watcherCount?: number;
  createdAt: string;
  updatedAt: string;
  /** Latest 5 bids, newest first (bidder labels masked; `isMe` is only set for a signed-in caller). */
  recentBids?: BidDTO[];
  /** The signed-in bidder's highest bid on this auction. */
  myHighestBidPaise?: number | null;
  /** The signed-in bidder's own maximum (proxy) bid. */
  myMaxBidPaise?: number | null;
  /** Seller / admin only. The reserve is hidden from everyone else. */
  reservePricePaise?: number | null;
  /** Counterparty contact — only for the winner and the seller once the auction ended with a winner. */
  contact?: AuctionContact | null;
}

export interface PageMeta {
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  nextCursor?: string | null;
}

export interface AuctionPage {
  items: AuctionCard[];
  meta: PageMeta;
  serverTime: string | null;
}

export type AuctionPageParam = { page: number } | { cursor: string };

export interface AuctionCategory {
  name: string;
  liveCount: number;
}

export interface AuctionWritePayload {
  title: string;
  description: string;
  category: string;
  condition: AuctionCondition;
  images: string[];
  startingBidPaise: number;
  minIncrementPaise?: number;
  /** null clears it on update. */
  reservePricePaise?: number | null;
  buyNowPricePaise?: number | null;
  startTime: string;
  endTime: string;
}

export interface AuctionFilters {
  status: BrowseStatus;
  q: string;
  category: string;
  condition: '' | AuctionCondition;
  /** Rupees (whole). Converted to paise when sent to the API. */
  minPrice?: number;
  maxPrice?: number;
  sort: AuctionSort;
  /** Restrict to one seller (seller profile page). */
  sellerId?: string;
}
