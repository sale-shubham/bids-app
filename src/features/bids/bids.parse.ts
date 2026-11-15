import { parsePaged } from '@/lib/paged';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import type { BidDTO, BuyNowResult, MyBidRow, PlaceBidResult } from './bids.types';

// Decoding for the bids endpoints (same role as auctions.parse.ts):
//   POST /auctions/:id/bids -> { success, data: { auction, bid, serverTime } }
//   GET  /auctions/:id/bids, GET /bids/mine -> paginated envelope.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;

export function parsePlaceBid(body: unknown): PlaceBidResult {
  const d = isObj(body) && isObj(body.data) ? body.data : {};
  return {
    auction: d.auction as AuctionDetail,
    bid: isObj(d.bid) ? (d.bid as unknown as BidDTO) : null,
    serverTime: typeof d.serverTime === 'string' ? d.serverTime : null,
    outbidByProxy: d.outbidByProxy === true,
  };
}

export function parseBuyNow(body: unknown): BuyNowResult {
  const d = isObj(body) && isObj(body.data) ? body.data : {};
  return { auction: d.auction as AuctionDetail, serverTime: typeof d.serverTime === 'string' ? d.serverTime : null };
}

export const parseBidPage = (body: unknown) => parsePaged<BidDTO>(body);
export const parseMyBidsPage = (body: unknown) => parsePaged<MyBidRow>(body);
