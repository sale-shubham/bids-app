import { api } from '@/lib/api-client';
import { parseCardList } from '@/features/auctions/auctions.parse';
import type { BulkItemPayload } from './bulk.types';

/** `POST /auctions/bulk`: all-or-nothing. Resolves with the created auction cards. */
export async function createBulk(items: BulkItemPayload[]) {
  const res = await api.post('/auctions/bulk', { items });
  return parseCardList(res.data);
}
