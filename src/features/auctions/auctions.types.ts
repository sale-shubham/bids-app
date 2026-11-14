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
}

export interface AuctionDetail extends AuctionCard {
  /** Sanitised HTML. */
  description: string;
  images: string[];
  minIncrementPaise: number;
  highestBidderId: string | null;
  winnerId: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface HomeAuctions {
  featured: AuctionCard[];
  endingSoon: AuctionCard[];
  upcoming: AuctionCard[];
  serverTime: string | null;
}

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
}
