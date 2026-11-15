import { api } from '@/lib/api-client';
import type { Paged } from '@/lib/paged';
import { parseRiskPage } from './risk.parse';
import type { ReviewRiskInput, RiskSignal, RiskTab } from './risk.types';

export async function fetchRisk(f: { tab: RiskTab }, page: number, pageSize: number): Promise<Paged<RiskSignal>> {
  const res = await api.get('/admin/risk', { params: { status: f.tab, page, pageSize } });
  return parseRiskPage(res.data);
}

export const reviewRisk = ({ id, outcome, note }: ReviewRiskInput) =>
  api.patch(`/admin/risk/${encodeURIComponent(id)}`, { outcome, ...(note ? { note } : {}) }).then((r) => r.data.data);
