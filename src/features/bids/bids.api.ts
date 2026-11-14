import { api } from '@/lib/api-client';
import { useLiveStore } from '@/store/live-store';
import { parseBidPage, parseMyBidsPage, parsePlaceBid } from './bids.parse';
import type { MyBidsTab } from './bids.types';

export const BIDS_PAGE_SIZE = 20;

export async function placeBid(auctionId: string, amountPaise: number) {
  const res = await api.post(`/auctions/${auctionId}/bids`, { amountPaise });
  const out = parsePlaceBid(res.data);
  if (out.serverTime) useLiveStore.getState().syncServerTime(out.serverTime);
  return out;
}

export async function fetchAuctionBids(auctionId: string, page: number) {
  const res = await api.get(`/auctions/${auctionId}/bids`, { params: { page, pageSize: BIDS_PAGE_SIZE } });
  return parseBidPage(res.data);
}

export async function fetchMyBids(tab: MyBidsTab, page: number) {
  const res = await api.get('/bids/mine', { params: { tab, page, pageSize: BIDS_PAGE_SIZE } });
  return parseMyBidsPage(res.data);
}
