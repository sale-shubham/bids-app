import { describe, expect, it } from 'vitest';
import { parseBidPage, parseMyBidsPage, parsePlaceBid } from './bids.parse';

describe('bids.parse', () => {
  it('parsePlaceBid extracts auction, bid, serverTime', () => {
    const r = parsePlaceBid({ data: { auction: { id: 'a' }, bid: { id: 'b' }, serverTime: 'T' } });
    expect(r).toEqual({ auction: { id: 'a' }, bid: { id: 'b' }, serverTime: 'T' });
  });
  it('parsePlaceBid serverTime is null when absent', () => {
    expect(parsePlaceBid({ data: { auction: {}, bid: {} } }).serverTime).toBeNull();
    expect(parsePlaceBid(null).serverTime).toBeNull();
  });
  it('bid pages use the paged envelope', () => {
    const body = { data: [{ id: 'x' }], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } };
    expect(parseBidPage(body).items).toHaveLength(1);
    expect(parseMyBidsPage(body).meta.total).toBe(1);
  });
});
