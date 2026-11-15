import { describe, expect, it } from 'vitest';
import { parseAuctionDetail, parseAuctionPage, parseCategories, parseWritten } from './auctions.parse';

const T = '2026-01-01T00:00:00.000Z';

describe('auctions.parse serverTime location', () => {
  it('reads it from the top level (paginated extra)', () => {
    expect(parseAuctionPage({ data: [], meta: {}, serverTime: T }).serverTime).toBe(T);
  });
  it('reads it from meta', () => {
    expect(parseAuctionPage({ data: [], meta: { serverTime: T } }).serverTime).toBe(T);
  });
  it('reads it from data (object payloads)', () => {
    expect(parseAuctionDetail({ data: { auction: { id: 'a' }, serverTime: T } }).serverTime).toBe(T);
  });
  it('prefers top level over meta', () => {
    expect(parseAuctionPage({ serverTime: 'top', meta: { serverTime: 'meta' } }).serverTime).toBe('top');
    expect(parseAuctionPage({ meta: { serverTime: 'meta' } }).serverTime).toBe('meta');
  });
  it('is null when missing or not a string', () => {
    expect(parseAuctionPage({ data: [], serverTime: 123 }).serverTime).toBeNull();
    expect(parseAuctionPage(null).serverTime).toBeNull();
  });
});

describe('auctions.parse', () => {
  it('parseAuctionPage tolerates bad bodies', () => {
    expect(parseAuctionPage('x')).toEqual({ items: [], meta: {}, serverTime: null });
    expect(parseAuctionPage({ data: [{ id: '1' }], meta: { nextCursor: 'c' } })).toMatchObject({ items: [{ id: '1' }], meta: { nextCursor: 'c' } });
  });
  it('parseAuctionDetail returns the auction', () => {
    expect(parseAuctionDetail({ data: { auction: { id: 'a1' } } }).auction).toEqual({ id: 'a1' });
  });
  it('parseCategories / parseWritten', () => {
    expect(parseCategories({ data: { categories: [{ name: 'Art', liveCount: 2 }] } })).toEqual([{ name: 'Art', liveCount: 2 }]);
    expect(parseCategories({ data: {} })).toEqual([]);
    expect(parseWritten({ data: { auction: { id: 'w' } } })).toEqual({ id: 'w' });
  });
});
