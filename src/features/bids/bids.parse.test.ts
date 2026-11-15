import { describe, expect, it } from 'vitest';
import { parseBidPage, parseBuyNow, parseMyBidsPage, parsePlaceBid } from './bids.parse';

describe('bids.parse', () => {
  it('parsePlaceBid extracts auction, bid, serverTime', () => {
    const r = parsePlaceBid({ data: { auction: { id: 'a' }, bid: { id: 'b' }, serverTime: 'T' } });
    expect(r).toEqual({ auction: { id: 'a' }, bid: { id: 'b' }, serverTime: 'T', outbidByProxy: false });
  });
  it('parsePlaceBid reads outbidByProxy and allows a null bid', () => {
    const r = parsePlaceBid({ data: { auction: { id: 'a' }, bid: null, outbidByProxy: true } });
    expect(r.outbidByProxy).toBe(true);
    expect(r.bid).toBeNull();
  });
  it('parseBuyNow extracts auction and serverTime', () => {
    expect(parseBuyNow({ data: { auction: { id: 'a' }, serverTime: 'T' } })).toEqual({ auction: { id: 'a' }, serverTime: 'T' });
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
