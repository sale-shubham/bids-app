import { api } from '@/lib/api-client';
import { useLiveStore } from '@/store/live-store';
import { parseBidPage, parseBuyNow, parseMyBidsPage, parsePlaceBid } from './bids.parse';
import type { MyBidsTab } from './bids.types';

export const BIDS_PAGE_SIZE = 20;

/** Every bid is a MAX bid: the system bids only as much as needed. */
export async function placeBid(auctionId: string, maxAmountPaise: number) {
  const res = await api.post(`/auctions/${auctionId}/bids`, { maxAmountPaise });
  const out = parsePlaceBid(res.data);
  if (out.serverTime) useLiveStore.getState().syncServerTime(out.serverTime);
  return out;
}

export async function buyNow(auctionId: string) {
  const res = await api.post(`/auctions/${auctionId}/buy-now`);
  const out = parseBuyNow(res.data);
  if (out.serverTime) useLiveStore.getState().syncServerTime(out.serverTime);
  return out;
}

export async function fetchAuctionBids(auctionId: string, page: number) {
  const res = await api.get(`/auctions/${auctionId}/bids`, { params: { page, pageSize: BIDS_PAGE_SIZE } });
  return parseBidPage(res.data);
}

export async function fetchMyBids(tab: MyBidsTab, page: number, pageSize: number = BIDS_PAGE_SIZE) {
  const res = await api.get('/bids/mine', { params: { tab, page, pageSize } });
  return parseMyBidsPage(res.data);
}
