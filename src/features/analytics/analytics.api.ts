import { api } from '@/lib/api-client';

export type AnalyticsDays = 7 | 30 | 90;
export const ANALYTICS_DAYS: AnalyticsDays[] = [7, 30, 90];

export interface SellerAnalytics {
  range: { from: string; to: string };
  totals: { views: number; uniqueViewers: number; watchers: number; bids: number; bidders: number; sold: number; revenuePaise: number };
  daily: { date: string; views: number; bids: number }[];
  auctions: {
    id: string;
    title: string;
    status: string;
    views: number;
    uniqueViewers: number;
    watchers: number;
    bids: number;
    bidders: number;
    currentBidPaise: number;
  }[];
}

export interface AuctionAnalytics {
  auction: { id: string; title: string; status: string };
  totals: { views: number; uniqueViewers: number; watchers: number; bids: number; bidders: number };
  daily: { date: string; views: number; uniqueViewers: number; bids: number }[];
}

export async function fetchSellerAnalytics(days: AnalyticsDays): Promise<SellerAnalytics> {
  const res = await api.get('/analytics/seller', { params: { days } });
  return res.data.data;
}

export async function fetchAuctionAnalytics(id: string, days: AnalyticsDays): Promise<AuctionAnalytics> {
  const res = await api.get(`/analytics/auctions/${encodeURIComponent(id)}`, { params: { days } });
  return res.data.data;
}

/** Counts a page view (guests allowed; the API answers 204). Callers fire and forget. */
export async function recordAuctionView(id: string): Promise<void> {
  await api.post(`/auctions/${encodeURIComponent(id)}/view`);
}
