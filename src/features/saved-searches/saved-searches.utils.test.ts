import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '@/features/auctions/auctions.filters';
import type { SavedSearchDTO } from './saved-searches.types';
import { hasSearchCriteria, savedSearchHref, summarizeSavedSearch, toSavedSearchPayload } from './saved-searches.utils';

const saved = (over: Partial<SavedSearchDTO> = {}): SavedSearchDTO => ({
  id: 's1',
  name: null,
  q: null,
  category: null,
  condition: null,
  minPricePaise: null,
  maxPricePaise: null,
  createdAt: '2026-11-01T00:00:00Z',
  ...over,
});

describe('saved search helpers', () => {
  it('hasSearchCriteria ignores status and sort', () => {
    expect(hasSearchCriteria({ ...DEFAULT_FILTERS, status: 'ended', sort: 'newest' })).toBe(false);
    expect(hasSearchCriteria({ ...DEFAULT_FILTERS, q: 'vase' })).toBe(true);
    expect(hasSearchCriteria({ ...DEFAULT_FILTERS, minPrice: 0 })).toBe(true);
  });

  it('converts rupees to paise and drops empty fields', () => {
    expect(toSavedSearchPayload({ ...DEFAULT_FILTERS, q: 'vase', condition: 'USED', minPrice: 500, maxPrice: 2000 }, ' Vases ')).toEqual({
      name: 'Vases',
      q: 'vase',
      condition: 'USED',
      minPricePaise: 50000,
      maxPricePaise: 200000,
    });
    expect(toSavedSearchPayload({ ...DEFAULT_FILTERS, category: 'Art' }, '')).toEqual({ category: 'Art' });
  });

  it('summarises and links back to results (paise -> rupees)', () => {
    const s = saved({ q: 'vase', category: 'Antiques', condition: 'USED', minPricePaise: 50000, maxPricePaise: 200000 });
    expect(summarizeSavedSearch(s)).toBe('"vase" · Antiques · Used · ₹500 - ₹2,000');
    expect(summarizeSavedSearch(saved({ maxPricePaise: 100000 }))).toBe('Up to ₹1,000');
    const href = savedSearchHref(s);
    expect(href.startsWith('/auctions?')).toBe(true);
    const p = new URLSearchParams(href.split('?')[1]);
    expect(p.get('q')).toBe('vase');
    expect(p.get('minPrice')).toBe('500');
    expect(p.get('maxPrice')).toBe('2000');
    expect(p.get('condition')).toBe('USED');
  });
});
