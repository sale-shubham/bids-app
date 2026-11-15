import type { AuctionCondition } from '@/features/auctions/auctions.types';

export interface SavedSearchDTO {
  id: string;
  name: string | null;
  q: string | null;
  category: string | null;
  condition: AuctionCondition | null;
  minPricePaise: number | null;
  maxPricePaise: number | null;
  createdAt: string;
}

export interface SavedSearchPayload {
  name?: string;
  q?: string;
  category?: string;
  condition?: AuctionCondition;
  minPricePaise?: number;
  maxPricePaise?: number;
}
