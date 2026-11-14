import { api } from '@/lib/api-client';
import { parseCheckout, parseCommissionPage, parseCommissionResponse, parseSummary } from './commissions.parse';
import type { CommissionTab } from './commissions.types';

export const COMMISSIONS_PAGE_SIZE = 20;

export async function fetchCommissions(status: CommissionTab, page: number) {
  const res = await api.get('/commissions/mine', { params: { status, page, pageSize: COMMISSIONS_PAGE_SIZE } });
  return parseCommissionPage(res.data);
}

export async function fetchCommission(id: string) {
  const res = await api.get(`/commissions/${encodeURIComponent(id)}`);
  return parseCommissionResponse(res.data);
}

export async function fetchCommissionSummary() {
  const res = await api.get('/commissions/summary');
  return parseSummary(res.data);
}

export async function createCommissionCheckout(id: string) {
  const res = await api.post(`/commissions/${id}/checkout`);
  return parseCheckout(res.data);
}
