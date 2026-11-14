import type {
  AuctionFilters,
  AuctionPageParam,
  AuctionPage,
  AuctionSort,
  BrowseStatus,
} from './auctions.types';

export const AUCTION_PAGE_SIZE = 12;

export const BROWSE_STATUSES: { value: BrowseStatus; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
];

export const SORT_OPTIONS: { value: AuctionSort; label: string }[] = [
  { value: 'endingSoon', label: 'Ending soon' },
  { value: 'newest', label: 'Newest' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
  { value: 'mostBids', label: 'Most bids' },
];

export const DEFAULT_FILTERS: AuctionFilters = {
  status: 'live',
  q: '',
  category: '',
  condition: '',
  sort: 'endingSoon',
};

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function get(raw: RawParams, key: string): string {
  if (raw instanceof URLSearchParams) return raw.get(key) ?? '';
  const v = raw[key];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

function rupees(v: string): number | undefined {
  const n = Number(v);
  return v !== '' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

/** URL search params -> filters (unknown values fall back to defaults). */
export function parseFilters(raw: RawParams): AuctionFilters {
  const status = get(raw, 'status');
  const sort = get(raw, 'sort');
  const condition = get(raw, 'condition');
  return {
    status: BROWSE_STATUSES.some((s) => s.value === status) ? (status as BrowseStatus) : DEFAULT_FILTERS.status,
    q: get(raw, 'q').slice(0, 100),
    category: get(raw, 'category'),
    condition: condition === 'NEW' || condition === 'USED' ? condition : '',
    minPrice: rupees(get(raw, 'minPrice')),
    maxPrice: rupees(get(raw, 'maxPrice')),
    sort: SORT_OPTIONS.some((s) => s.value === sort) ? (sort as AuctionSort) : DEFAULT_FILTERS.sort,
  };
}

/** Filters -> URL search params (defaults omitted so URLs stay clean). */
export function filtersToSearchParams(f: AuctionFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.status !== DEFAULT_FILTERS.status) p.set('status', f.status);
  if (f.q) p.set('q', f.q);
  if (f.category) p.set('category', f.category);
  if (f.condition) p.set('condition', f.condition);
  if (f.minPrice !== undefined) p.set('minPrice', String(f.minPrice));
  if (f.maxPrice !== undefined) p.set('maxPrice', String(f.maxPrice));
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort);
  return p;
}

export function pageParams(param: AuctionPageParam): Record<string, string | number> {
  return 'cursor' in param
    ? { cursor: param.cursor, limit: AUCTION_PAGE_SIZE }
    : { page: param.page, pageSize: AUCTION_PAGE_SIZE };
}

/** Query params for GET /auctions (price in paise). */
export function auctionListParams(
  f: AuctionFilters,
  param: AuctionPageParam = { page: 1 },
): Record<string, string | number> {
  const out: Record<string, string | number> = { status: f.status, sort: f.sort };
  if (f.q) out.q = f.q;
  if (f.category) out.category = f.category;
  if (f.condition) out.condition = f.condition;
  if (f.minPrice !== undefined) out.minPrice = f.minPrice * 100;
  if (f.maxPrice !== undefined) out.maxPrice = f.maxPrice * 100;
  return { ...out, ...pageParams(param) };
}

/** `getNextPageParam` for both offset and cursor metas. */
export function nextAuctionPage(last: AuctionPage): AuctionPageParam | undefined {
  const m = last.meta;
  if (m.nextCursor) return { cursor: m.nextCursor };
  if (m.page !== undefined && m.totalPages !== undefined && m.page < m.totalPages) return { page: m.page + 1 };
  return undefined;
}
