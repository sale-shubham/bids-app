export interface SavedSearchDTO {
  id: string;
  name: string | null;
  q: string | null;
  category: string | null;
  condition: 'NEW' | 'USED' | null;
  minPricePaise: number | null;
  maxPricePaise: number | null;
  createdAt: string;
}

export interface SavedSearchPayload {
  name?: string;
  q?: string;
  category?: string;
  condition?: 'NEW' | 'USED';
  minPricePaise?: number;
  maxPricePaise?: number;
}
