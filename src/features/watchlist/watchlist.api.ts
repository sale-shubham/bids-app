import { api } from '@/lib/api-client';
import { parsePaged, type Paged } from '@/lib/paged';
import type { AuctionCard } from '@/features/auctions/auctions.types';

export interface WatchlistEntry {
  addedAt: string;
  auction: AuctionCard;
}

export interface WatchlistIds {
  ids: string[];
  activeCount: number;
}

export const WATCHLIST_PAGE_SIZE = 12;

export async function fetchWatchlist(page: number, pageSize: number = WATCHLIST_PAGE_SIZE): Promise<Paged<WatchlistEntry>> {
  const res = await api.get('/watchlist', { params: { page, pageSize } });
  return parsePaged<WatchlistEntry>(res.data);
}

export async function fetchWatchlistIds(): Promise<WatchlistIds> {
  const res = await api.get('/watchlist/ids');
  const d = res.data?.data ?? {};
  return {
    ids: Array.isArray(d.ids) ? (d.ids as string[]) : [],
    activeCount: typeof d.activeCount === 'number' ? d.activeCount : 0,
  };
}

export async function addToWatchlist(auctionId: string): Promise<void> {
  await api.post(`/watchlist/${encodeURIComponent(auctionId)}`);
}

export async function removeFromWatchlist(auctionId: string): Promise<void> {
  await api.delete(`/watchlist/${encodeURIComponent(auctionId)}`);
}
