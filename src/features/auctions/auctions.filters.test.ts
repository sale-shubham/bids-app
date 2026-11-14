import { describe, expect, it } from 'vitest';
import {
  AUCTION_PAGE_SIZE,
  DEFAULT_FILTERS,
  auctionListParams,
  filtersToSearchParams,
  nextAuctionPage,
  pageParams,
  parseFilters,
} from './auctions.filters';
import type { AuctionFilters, AuctionPage } from './auctions.types';

describe('parseFilters', () => {
  it('empty params give defaults', () => {
    expect(parseFilters(new URLSearchParams())).toEqual({ ...DEFAULT_FILTERS, minPrice: undefined, maxPrice: undefined });
  });
  it('falls back for unknown status/sort/condition', () => {
    const f = parseFilters(new URLSearchParams('status=zzz&sort=zzz&condition=BROKEN'));
    expect(f).toMatchObject({ status: 'live', sort: 'endingSoon', condition: '' });
  });
  it('reads Next.js-style record params (arrays take the first value)', () => {
    const f = parseFilters({ status: ['ended', 'live'], q: 'vase', minPrice: '100' });
    expect(f).toMatchObject({ status: 'ended', q: 'vase', minPrice: 100 });
  });
  it('price: floors, rejects negatives and junk', () => {
    expect(parseFilters(new URLSearchParams('minPrice=10.9&maxPrice=-3')).minPrice).toBe(10);
    expect(parseFilters(new URLSearchParams('minPrice=10.9&maxPrice=-3')).maxPrice).toBeUndefined();
    expect(parseFilters(new URLSearchParams('minPrice=abc')).minPrice).toBeUndefined();
    expect(parseFilters(new URLSearchParams('minPrice=0')).minPrice).toBe(0);
  });
  it('truncates q to 100 chars', () => {
    expect(parseFilters(new URLSearchParams(`q=${'x'.repeat(150)}`)).q).toHaveLength(100);
  });
});

describe('filters <-> URL round trip', () => {
  const full: AuctionFilters = { status: 'upcoming', q: 'brass vase', category: 'Antiques', condition: 'USED', minPrice: 100, maxPrice: 5000, sort: 'priceAsc' };
  it('round-trips a fully specified filter set', () => {
    const qs = filtersToSearchParams(full).toString();
    expect(parseFilters(new URLSearchParams(qs))).toEqual(full);
  });
  it('defaults are omitted so URLs stay clean', () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe('');
  });
  it('a min price of 0 is kept', () => {
    const qs = filtersToSearchParams({ ...DEFAULT_FILTERS, minPrice: 0 }).toString();
    expect(qs).toBe('minPrice=0');
  });
});

describe('API param builders', () => {
  it('auctionListParams converts rupees to paise and paginates', () => {
    expect(auctionListParams({ ...DEFAULT_FILTERS, q: 'a', minPrice: 10, maxPrice: 20, sellerId: 's1' })).toEqual({
      status: 'live',
      sort: 'endingSoon',
      sellerId: 's1',
      q: 'a',
      minPrice: 1000,
      maxPrice: 2000,
      page: 1,
      pageSize: AUCTION_PAGE_SIZE,
    });
  });
  it('cursor params use cursor+limit', () => {
    expect(pageParams({ cursor: 'c' })).toEqual({ cursor: 'c', limit: AUCTION_PAGE_SIZE });
    expect(pageParams({ page: 3 })).toEqual({ page: 3, pageSize: AUCTION_PAGE_SIZE });
  });
  it('nextAuctionPage handles cursor, offset and the end', () => {
    const mk = (meta: AuctionPage['meta']): AuctionPage => ({ items: [], meta, serverTime: null });
    expect(nextAuctionPage(mk({ nextCursor: 'n' }))).toEqual({ cursor: 'n' });
    expect(nextAuctionPage(mk({ page: 1, totalPages: 2 }))).toEqual({ page: 2 });
    expect(nextAuctionPage(mk({ page: 2, totalPages: 2 }))).toBeUndefined();
    expect(nextAuctionPage(mk({ nextCursor: null }))).toBeUndefined();
  });
});
