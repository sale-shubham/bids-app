import { api } from '@/lib/api-client';
import { useLiveStore } from '@/store/live-store';
import { auctionListParams, pageParams } from './auctions.filters';
import {
  parseAuctionDetail,
  parseAuctionPage,
  parseCardList,
  parseCategories,
  parseWritten,
} from './auctions.parse';
import type {
  AuctionFilters,
  AuctionPage,
  AuctionPageParam,
  AuctionWritePayload,
  MineStatus,
} from './auctions.types';

// Browser-side adapter for the auctions endpoints. Response decoding (where
// `serverTime` / meta live) is in auctions.parse.ts — the single place to
// change if the backend envelope moves. Every decoded serverTime also feeds the
// live store so countdowns stay on server time.

function sync<T extends { serverTime: string | null }>(r: T): T {
  if (r.serverTime) useLiveStore.getState().syncServerTime(r.serverTime);
  return r;
}

export async function fetchAuctions(filters: AuctionFilters, param: AuctionPageParam): Promise<AuctionPage> {
  const res = await api.get('/auctions', { params: auctionListParams(filters, param) });
  return sync(parseAuctionPage(res.data));
}

export async function fetchMyAuctions(status: MineStatus, param: AuctionPageParam): Promise<AuctionPage> {
  const res = await api.get('/auctions/mine', { params: { status, ...pageParams(param) } });
  return sync(parseAuctionPage(res.data));
}

export async function fetchCategories() {
  const res = await api.get('/auctions/categories');
  return parseCategories(res.data);
}

export async function fetchAuction(id: string) {
  const res = await api.get(`/auctions/${id}`);
  return sync(parseAuctionDetail(res.data));
}

export async function createAuction(input: AuctionWritePayload) {
  const res = await api.post('/auctions', input);
  return parseWritten(res.data);
}

export async function updateAuction(id: string, input: Partial<AuctionWritePayload>) {
  const res = await api.patch(`/auctions/${id}`, input);
  return parseWritten(res.data);
}

export async function deleteAuction(id: string) {
  await api.delete(`/auctions/${id}`);
}

export async function republishAuction(id: string, input: { startTime: string; endTime: string }) {
  const res = await api.post(`/auctions/${id}/republish`, input);
  return parseWritten(res.data);
}

export async function fetchSimilarSold(id: string) {
  const res = await api.get(`/auctions/${id}/similar-sold`);
  return parseCardList(res.data);
}
