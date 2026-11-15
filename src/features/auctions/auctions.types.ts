import type { AuctionContact, BidDTO } from '@/features/bids/bids.types';
import type { AuctionSaleSummary } from '@/features/sales/sales.types';
import type { ReviewDTO } from '@/features/reviews/reviews.types';
import type { CategoryPathItem } from '@/features/categories/categories.types';

export type AuctionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type AuctionCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'USED' | 'FOR_PARTS';

/** Condition grades, best first, with their display labels. */
export const CONDITIONS: { value: AuctionCondition; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'USED', label: 'Used' },
  { value: 'FOR_PARTS', label: 'For parts / not working' },
];

export function conditionLabel(c: string): string {
  return CONDITIONS.find((x) => x.value === c)?.label ?? c;
}

/** Where a lot can be collected / shipped from (`shippingOptions`). */
export interface ShippingOptions {
  pickup: boolean;
  pickupCity?: string | null;
  courier: boolean;
  shippingFeePaise?: number | null;
  shipsWithinDays?: number | null;
}

/** One specification row on the detail page. */
export interface AuctionSpec {
  key: string;
  label: string;
  value: string | number;
  unit?: string | null;
}
export type AuctionSort = 'endingSoon' | 'newest' | 'priceAsc' | 'priceDesc' | 'mostBids' | 'recentlySold';
/** Public browse tabs (`GET /auctions?status=`). */
export type BrowseStatus = 'live' | 'upcoming' | 'ended';
/** Seller tabs (`GET /auctions/mine?status=`). */
export type MineStatus = 'upcoming' | 'live' | 'ended' | 'cancelled';

export interface AuctionSeller {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** Average seller rating; absent on snapshots saved before ratings existed. */
  ratingAvg?: number | null;
  ratingCount?: number;
  /** Verified seller (KYC'd payout account). Absent on older snapshots. */
  verified?: boolean;
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
  /** Slug of the listing's category (browse links use it). */
  categorySlug?: string;
  /** Pre-auction estimate range (paise); both or neither. */
  estimateLowPaise?: number | null;
  estimateHighPaise?: number | null;
  /** Listing has a video (`hasVideo`); the URL is on the detail. */
  hasVideo?: boolean;
  /** Ended with a winner. */
  sold?: boolean;
  endedAt?: string | null;
  /** Paid promotion is active: shown with a "Promoted" badge. */
  promoted?: boolean;
}

export interface AuctionDetail extends AuctionCard {
  /** Sanitised HTML. */
  description: string;
  images: string[];
  /** Uploaded listing video (mp4/webm), when the seller added one. */
  videoUrl?: string | null;
  categoryId?: string;
  /** Root to leaf breadcrumb. */
  categoryPath?: CategoryPathItem[];
  /** Category attribute values, display-ready. */
  specs?: AuctionSpec[];
  /** Sanitised HTML. */
  conditionReport?: string | null;
  shippingOptions?: ShippingOptions | null;
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
  /** The winner's review of the seller, once left. */
  review?: ReviewDTO | null;
  /** The viewer won this auction and has not rated the seller yet. */
  canReview?: boolean;
  /** The checkout sale created when this auction sold (buyer / seller / admin only); null for legacy auctions. */
  sale?: AuctionSaleSummary | null;
  /** Bid deposit set on this auction (paise); null = none. */
  depositPaise?: number | null;
  /** The viewer's deposit requirement: `requiredPaise` 0 = no deposit needed. Signed-in viewers only. */
  deposit?: AuctionDeposit | null;
}

export type DepositStatus = 'PENDING' | 'HELD' | 'REFUNDED' | 'FORFEITED';
export interface AuctionDeposit {
  requiredPaise: number;
  status: DepositStatus | null;
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
  /** Category id (the `category` name is a legacy alias the API still accepts). */
  categoryId: string;
  attributes: Record<string, string | number>;
  condition: AuctionCondition;
  images: string[];
  startingBidPaise: number;
  minIncrementPaise?: number;
  /** null clears it on update. */
  reservePricePaise?: number | null;
  buyNowPricePaise?: number | null;
  /** Both or neither; null clears on update. */
  estimateLowPaise?: number | null;
  estimateHighPaise?: number | null;
  /** Sanitised server-side; '' clears. */
  conditionReport?: string;
  shippingOptions: ShippingOptions;
  /** Uploaded video URL; null clears it. */
  videoUrl?: string | null;
  startTime: string;
  endTime: string;
}

export interface AuctionFilters {
  status: BrowseStatus;
  q: string;
  category: string;
  condition: '' | AuctionCondition;
  /** Extra category attribute filters: `attr.<key>=value` (up to 5). */
  attrs?: Record<string, string>;
  /** Rupees (whole). Converted to paise when sent to the API. */
  minPrice?: number;
  maxPrice?: number;
  sort: AuctionSort;
  /** Restrict to one seller (seller profile page). */
  sellerId?: string;
  /** Only auctions from verified sellers (`verified=true`). */
  verified?: boolean;
  /** Only auctions that ended with a winner (`sold=true`), for the /sold archive. */
  sold?: boolean;
}
