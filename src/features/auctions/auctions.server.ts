import { serverFetch } from '@/lib/server-api';
import { parseAuctionDetail, parseAuctionPage, parseCategories } from './auctions.parse';
import { auctionListParams } from './auctions.filters';
import type { AuctionFilters, AuctionPage } from './auctions.types';

// Server-component data loaders (SEO / first paint). Shapes are decoded by
// auctions.parse.ts.

export async function getAuctionDetailServer(id: string) {
  return parseAuctionDetail(await serverFetch(`/auctions/${encodeURIComponent(id)}`));
}

export async function getCategoriesServer() {
  return parseCategories(await serverFetch('/auctions/categories', { revalidate: 30 }));
}

/** First page of a filtered list; null when the API fails (the client list then fetches itself). */
export async function getAuctionPageServer(filters: AuctionFilters): Promise<AuctionPage | null> {
  try {
    return parseAuctionPage(
      await serverFetch('/auctions', { params: auctionListParams(filters), revalidate: 15, notFoundOn404: false }),
    );
  } catch {
    return null;
  }
}
