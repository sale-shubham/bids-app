import type { AuctionCondition } from '@/features/auctions/auctions.types';

/** One row of `POST /auctions/bulk` (same fields as a single create; `category` is a name or slug). */
export interface BulkItemPayload {
  title: string;
  description: string;
  category: string;
  condition: AuctionCondition;
  images: string[];
  startingBidPaise: number;
  minIncrementPaise?: number;
  reservePricePaise?: number;
  buyNowPricePaise?: number;
  estimateLowPaise?: number;
  estimateHighPaise?: number;
  startTime: string;
  endTime: string;
}

export interface RowError {
  field: string;
  message: string;
}

/** A CSV row after mapping: the values needed to build a payload plus client-side validation errors. */
export interface BulkRow {
  /** 0-based position among the data rows (matches the API's `details.rows[].index`). */
  index: number;
  title: string;
  category: string;
  startingBidPaise: number | null;
  /** Image file names from the CSV, in order. */
  imageNames: string[];
  errors: RowError[];
  draft: Omit<BulkItemPayload, 'images' | 'startTime' | 'endTime'> | null;
  /** `null` = start when the batch is submitted ("now"). */
  startAt: Date | null;
  durationHours: number;
}
