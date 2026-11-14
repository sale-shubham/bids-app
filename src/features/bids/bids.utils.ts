import type { AuctionCard } from '@/features/auctions/auctions.types';

type PriceInfo = Pick<AuctionCard, 'bidCount' | 'startingBidPaise' | 'currentBidPaise'>;

/** The price bids are measured from: the starting bid until someone bids. */
export const basePricePaise = (a: PriceInfo) => (a.bidCount === 0 ? a.startingBidPaise : a.currentBidPaise);

/** Minimum acceptable next bid (same rule as the API). */
export function minNextBidPaise(a: PriceInfo & { minIncrementPaise: number }) {
  return a.bidCount === 0 ? a.startingBidPaise : a.currentBidPaise + a.minIncrementPaise;
}

/** Whole rupees (digits only) to paise, or null when the text is not a positive integer. */
export function rupeesToPaise(text: string): number | null {
  const t = text.trim().replace(/,/g, '');
  if (!/^\d{1,9}$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n * 100 : null;
}

/** Smallest whole-rupee amount that is at least `paise`. */
export const ceilRupees = (paise: number) => Math.ceil(paise / 100);
