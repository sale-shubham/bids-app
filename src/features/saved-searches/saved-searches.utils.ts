import { filtersToSearchParams } from '@/features/auctions/auctions.filters';
import { conditionLabel, type AuctionFilters } from '@/features/auctions/auctions.types';
import { formatINR } from '@/lib/utils';
import type { SavedSearchDTO, SavedSearchPayload } from './saved-searches.types';

/** At least one criterion that a saved search can store (status and sort are not alerts). */
export function hasSearchCriteria(f: AuctionFilters): boolean {
  return !!(f.q || f.category || f.condition || f.minPrice !== undefined || f.maxPrice !== undefined);
}

/** Current URL filters (rupees) -> request body (paise), like `auctionListParams`. */
export function toSavedSearchPayload(f: AuctionFilters, name?: string): SavedSearchPayload {
  const out: SavedSearchPayload = {};
  const n = name?.trim();
  if (n) out.name = n;
  if (f.q) out.q = f.q;
  if (f.category) out.category = f.category;
  if (f.condition) out.condition = f.condition;
  if (f.minPrice !== undefined) out.minPricePaise = f.minPrice * 100;
  if (f.maxPrice !== undefined) out.maxPricePaise = f.maxPrice * 100;
  return out;
}

/** Readable one-liner, e.g. `"vase" · Antiques · Used · ₹500 - ₹2,000`. */
export function summarizeSavedSearch(s: SavedSearchDTO): string {
  const parts: string[] = [];
  if (s.q) parts.push(`"${s.q}"`);
  if (s.category) parts.push(s.category);
  if (s.condition) parts.push(conditionLabel(s.condition));
  if (s.minPricePaise != null && s.maxPricePaise != null) parts.push(`${formatINR(s.minPricePaise)} - ${formatINR(s.maxPricePaise)}`);
  else if (s.minPricePaise != null) parts.push(`From ${formatINR(s.minPricePaise)}`);
  else if (s.maxPricePaise != null) parts.push(`Up to ${formatINR(s.maxPricePaise)}`);
  return parts.join(' · ') || 'Any auction';
}

/** `/auctions?...` link that re-runs the saved search (rupees in the URL). */
export function savedSearchHref(s: SavedSearchDTO): string {
  const filters: AuctionFilters = {
    status: 'live',
    q: s.q ?? '',
    category: s.category ?? '',
    condition: s.condition ?? '',
    minPrice: s.minPricePaise != null ? Math.floor(s.minPricePaise / 100) : undefined,
    maxPrice: s.maxPricePaise != null ? Math.floor(s.maxPricePaise / 100) : undefined,
    sort: 'endingSoon',
  };
  const qs = filtersToSearchParams(filters).toString();
  return qs ? `/auctions?${qs}` : '/auctions';
}
