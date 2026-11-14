import { describe, expect, it } from 'vitest';
import type { InfiniteData } from '@tanstack/react-query';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import type { BidDTO } from '@/features/bids/bids.types';
import type { Paged } from '@/lib/paged';
import { RECENT_BIDS_MAX, applyBidPlaced, applyEnded, applyExtended, bidFromEvent, prependBidToPages } from './live.reducers';
import { isMemberEvent, isRoomEvent, parseLiveEvent, type BidPlacedEvent } from './live.types';

const auction = (over: Partial<AuctionDetail> = {}): AuctionDetail =>
  ({
    id: 'a1',
    title: 'Vase',
    startingBidPaise: 100000,
    currentBidPaise: 0,
    minIncrementPaise: 10000,
    bidCount: 0,
    status: 'LIVE',
    endTime: '2026-01-02T00:00:00.000Z',
    highestBidderId: null,
    winnerId: null,
    endedAt: null,
    recentBids: [],
    ...over,
  }) as unknown as AuctionDetail;

const placed = (over: Partial<BidPlacedEvent> = {}, bidId = 'b1'): BidPlacedEvent => ({
  type: 'bid.placed',
  auctionId: 'a1',
  currentBidPaise: 110000,
  bidCount: 1,
  endTime: '2026-01-02T00:05:00.000Z',
  highestBidderId: 'u2',
  bid: { id: bidId, amountPaise: 110000, createdAt: '2026-01-01T00:00:00.000Z', bidderLabel: 'R***h' },
  ...over,
});

describe('applyBidPlaced', () => {
  it('updates price, count, endTime, highest bidder and prepends the bid', () => {
    const next = applyBidPlaced(auction(), placed(), 'u1');
    expect(next).toMatchObject({ currentBidPaise: 110000, bidCount: 1, highestBidderId: 'u2', endTime: '2026-01-02T00:05:00.000Z', status: 'LIVE' });
    expect(next.recentBids?.[0]).toMatchObject({ id: 'b1', isMe: false });
  });
  it('marks isMe when the viewer is the highest bidder', () => {
    expect(bidFromEvent(placed(), 'u2').isMe).toBe(true);
    expect(bidFromEvent(placed(), undefined).isMe).toBe(false);
  });
  it('ignores a stale event (fewer bids than the cache)', () => {
    const a = auction({ bidCount: 5, currentBidPaise: 150000 });
    expect(applyBidPlaced(a, placed({ bidCount: 4 }), 'u1')).toBe(a);
  });
  it('ignores an event for another auction', () => {
    const a = auction();
    expect(applyBidPlaced(a, placed({ auctionId: 'other' }), 'u1')).toBe(a);
  });
  it('dedupes by bid id (idempotent)', () => {
    const once = applyBidPlaced(auction(), placed(), 'u1');
    const twice = applyBidPlaced(once, placed(), 'u1');
    expect(twice.recentBids).toHaveLength(1);
  });
  it(`caps recentBids at ${RECENT_BIDS_MAX}, newest first`, () => {
    let a = auction();
    for (let i = 1; i <= 8; i++) a = applyBidPlaced(a, placed({ bidCount: i, currentBidPaise: 100000 + i }, `b${i}`), 'u1');
    expect(a.recentBids).toHaveLength(RECENT_BIDS_MAX);
    expect(a.recentBids?.map((b) => b.id)).toEqual(['b8', 'b7', 'b6', 'b5', 'b4']);
  });
  it('flips a SCHEDULED auction to LIVE', () => {
    expect(applyBidPlaced(auction({ status: 'SCHEDULED' }), placed(), 'u1').status).toBe('LIVE');
  });
});

describe('applyExtended / applyEnded', () => {
  it('extended only changes endTime of the matching auction', () => {
    const a = auction();
    expect(applyExtended(a, { type: 'auction.extended', auctionId: 'a1', endTime: 'NEW' }).endTime).toBe('NEW');
    expect(applyExtended(a, { type: 'auction.extended', auctionId: 'zz', endTime: 'NEW' })).toBe(a);
  });
  it('ended with a winner sets final price, winner, ENDED', () => {
    const a = auction({ bidCount: 2, currentBidPaise: 120000 });
    const n = applyEnded(a, { type: 'auction.ended', auctionId: 'a1', winnerId: 'u2', finalBidPaise: 130000, bidCount: 3, endedAt: 'E' });
    expect(n).toMatchObject({ status: 'ENDED', winnerId: 'u2', currentBidPaise: 130000, bidCount: 3, endedAt: 'E' });
  });
  it('ended without a winner keeps the price and never lowers bidCount', () => {
    const a = auction({ bidCount: 2, currentBidPaise: 120000 });
    const n = applyEnded(a, { type: 'auction.ended', auctionId: 'a1', winnerId: null, finalBidPaise: 0, bidCount: 0, endedAt: 'E' });
    expect(n).toMatchObject({ status: 'ENDED', winnerId: null, currentBidPaise: 120000, bidCount: 2 });
  });
  it('ended for another auction is a no-op', () => {
    const a = auction();
    expect(applyEnded(a, { type: 'auction.ended', auctionId: 'x', winnerId: null, finalBidPaise: 0, bidCount: 0, endedAt: 'E' })).toBe(a);
  });
});

describe('prependBidToPages', () => {
  const bid = (id: string): BidDTO => ({ id, amountPaise: 1, createdAt: 'x', bidderLabel: 'a', isMe: false });
  const data = (): InfiniteData<Paged<BidDTO>, number> => ({
    pageParams: [1],
    pages: [{ items: [bid('old')], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }],
  });
  it('adds to the first page and bumps total', () => {
    const n = prependBidToPages(data(), bid('new'))!;
    expect(n.pages[0].items.map((b) => b.id)).toEqual(['new', 'old']);
    expect(n.pages[0].meta.total).toBe(2);
  });
  it('is a no-op when the bid exists, or when there is no cache', () => {
    const d = data();
    expect(prependBidToPages(d, bid('old'))).toBe(d);
    expect(prependBidToPages(undefined, bid('x'))).toBeUndefined();
    const empty = { pageParams: [], pages: [] };
    expect(prependBidToPages(empty, bid('x'))).toBe(empty);
  });
});

describe('parseLiveEvent', () => {
  it('parses bid.placed', () => {
    const ev = parseLiveEvent(placed());
    expect(ev).toMatchObject({ type: 'bid.placed', auctionId: 'a1', highestBidderId: 'u2' });
  });
  it('bid.placed: missing highestBidderId -> null; bad bid -> null event', () => {
    expect(parseLiveEvent({ ...placed(), highestBidderId: undefined })).toMatchObject({ highestBidderId: null });
    expect(parseLiveEvent({ ...placed(), bid: { id: 'x' } })).toBeNull();
    expect(parseLiveEvent({ ...placed(), bidCount: 'many' })).toBeNull();
  });
  it('parses extended / ended / outbid / won / notification', () => {
    expect(parseLiveEvent({ type: 'auction.extended', auctionId: 'a', endTime: 'T' })).toEqual({ type: 'auction.extended', auctionId: 'a', endTime: 'T' });
    expect(parseLiveEvent({ type: 'auction.ended', auctionId: 'a', winnerId: null, finalBidPaise: 5, bidCount: 1, endedAt: 'E' })).toMatchObject({ winnerId: null });
    expect(parseLiveEvent({ type: 'bid.outbid', auctionId: 'a', title: 'T', currentBidPaise: 5 })).toMatchObject({ type: 'bid.outbid' });
    expect(parseLiveEvent({ type: 'auction.won', auctionId: 'a', title: 'T', finalBidPaise: 5 })).toMatchObject({ type: 'auction.won' });
    expect(parseLiveEvent({ type: 'notification.new', notificationId: 'n' })).toEqual({ type: 'notification.new', notificationId: 'n' });
  });
  it('rejects pong, unknown types, junk and incomplete frames', () => {
    for (const raw of [null, 'x', [], {}, { type: 'pong' }, { type: 'bid.outbid', auctionId: 'a' }, { type: 'auction.extended', auctionId: 'a' }, { type: 'notification.new' }]) {
      expect(parseLiveEvent(raw)).toBeNull();
    }
  });
  it('room vs member event guards', () => {
    expect(isRoomEvent(parseLiveEvent({ type: 'auction.extended', auctionId: 'a', endTime: 'T' })!)).toBe(true);
    const m = parseLiveEvent({ type: 'notification.new', notificationId: 'n' })!;
    expect(isMemberEvent(m)).toBe(true);
    expect(isRoomEvent(m)).toBe(false);
  });
});
