import { api } from '@/lib/api-client';
import { parseStrikeList } from './strikes.parse';

export async function fetchMemberStrikes(memberId: string) {
  const res = await api.get(`/admin/members/${encodeURIComponent(memberId)}/strikes`);
  return parseStrikeList(res.data);
}

export const removeStrike = (id: string, note?: string) =>
  api.post(`/admin/strikes/${encodeURIComponent(id)}/remove`, note ? { note } : {}).then((r) => r.data.data);
