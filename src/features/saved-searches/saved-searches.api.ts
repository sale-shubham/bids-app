import { api } from '@/lib/api-client';
import type { SavedSearchDTO, SavedSearchPayload } from './saved-searches.types';

export async function fetchSavedSearches(): Promise<SavedSearchDTO[]> {
  const res = await api.get('/saved-searches');
  const items = res.data?.data?.items;
  return Array.isArray(items) ? (items as SavedSearchDTO[]) : [];
}

export async function createSavedSearch(body: SavedSearchPayload): Promise<SavedSearchDTO> {
  const res = await api.post('/saved-searches', body);
  return res.data.data.savedSearch as SavedSearchDTO;
}

export async function deleteSavedSearch(id: string): Promise<void> {
  await api.delete(`/saved-searches/${encodeURIComponent(id)}`);
}
