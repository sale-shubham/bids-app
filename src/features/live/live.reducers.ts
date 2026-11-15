// Pure event -> cache reducers (no React, no query client) so they can be unit-tested.
import type { InfiniteData } from '@tanstack/react-query';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import type { BidDTO } from '@/features/bids/bids.types';
import type { Paged } from '@/lib/paged';
import type { AuctionEndedEvent, AuctionExtendedEvent, BidPlacedEvent } from './live.types';

export const RECENT_BIDS_MAX = 5;

/** The bid row a `bid.placed` event adds (the new bid is always the highest). */
export function bidFromEvent(ev: BidPlacedEvent, meId: string | undefined): BidDTO {
  return { ...ev.bid, isMe: !!meId && ev.highestBidderId === meId };
}

/** Apply `bid.placed`. Stale events (fewer bids than the cache already has) are ignored. Idempotent per bid id. */
export function applyBidPlaced(a: AuctionDetail, ev: BidPlacedEvent, meId: string | undefined): AuctionDetail {
  if (ev.auctionId !== a.id || ev.bidCount < a.bidCount) return a;
  const bid = bidFromEvent(ev, meId);
  const rest = (a.recentBids ?? []).filter((b) => b.id !== bid.id);
  return {
    ...a,
    currentBidPaise: ev.currentBidPaise,
    bidCount: ev.bidCount,
    endTime: ev.endTime,
    highestBidderId: ev.highestBidderId,
    status: 'LIVE',
    reserveMet: ev.reserveMet,
    buyNowPricePaise: ev.bidCount > 0 ? null : a.buyNowPricePaise,
    recentBids: [bid, ...rest].slice(0, RECENT_BIDS_MAX),
  };
}

export function applyExtended(a: AuctionDetail, ev: AuctionExtendedEvent): AuctionDetail {
  return ev.auctionId === a.id ? { ...a, endTime: ev.endTime } : a;
}

/** Winner / contact come from the server via a follow-up refetch; this only flips the visible state. */
export function applyEnded(a: AuctionDetail, ev: AuctionEndedEvent): AuctionDetail {
  if (ev.auctionId !== a.id) return a;
  return {
    ...a,
    status: 'ENDED',
    bidCount: Math.max(a.bidCount, ev.bidCount),
    currentBidPaise: ev.winnerId ? ev.finalBidPaise : a.currentBidPaise,
    winnerId: ev.winnerId,
    endedAt: ev.endedAt,
  };
}

/** Prepend a bid to the first page of the cached history; no-op if absent or already there. */
export function prependBidToPages(
  data: InfiniteData<Paged<BidDTO>, number> | undefined,
  bid: BidDTO,
): InfiniteData<Paged<BidDTO>, number> | undefined {
  if (!data || data.pages.length === 0) return data;
  if (data.pages.some((p) => p.items.some((b) => b.id === bid.id))) return data;
  const [first, ...others] = data.pages;
  return {
    ...data,
    pages: [{ ...first, items: [bid, ...first.items], meta: { ...first.meta, total: first.meta.total + 1 } }, ...others],
  };
}
