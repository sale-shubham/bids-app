import { api } from '@/lib/api-client';
import { parseCheckout } from '@/features/commissions/commissions.parse';
import { parseSalePage, parseSaleResponse } from './sales.parse';
import type { SaleListRole, SaleStatus, ShipSaleInput } from './sales.types';

export const SALES_PAGE_SIZE = 20;

export async function fetchMySales(role: SaleListRole, status: SaleStatus | 'all', page: number) {
  const params: Record<string, string | number> = { role, page, pageSize: SALES_PAGE_SIZE };
  if (status !== 'all') params.status = status;
  const res = await api.get('/sales/mine', { params });
  return parseSalePage(res.data);
}

export async function fetchSale(id: string) {
  const res = await api.get(`/sales/${encodeURIComponent(id)}`);
  return parseSaleResponse(res.data);
}

/** Same payload as `POST /commissions/:id/checkout` (stub mode when `keyId === 'stub'`). */
export async function createSaleCheckout(id: string) {
  const res = await api.post(`/sales/${encodeURIComponent(id)}/checkout`);
  return parseCheckout(res.data);
}

export async function shipSale(id: string, body: ShipSaleInput) {
  const res = await api.post(`/sales/${encodeURIComponent(id)}/ship`, body);
  return parseSaleResponse(res.data);
}

export async function confirmSale(id: string) {
  const res = await api.post(`/sales/${encodeURIComponent(id)}/confirm`);
  return parseSaleResponse(res.data);
}

export async function disputeSale(id: string, reason: string) {
  const res = await api.post(`/sales/${encodeURIComponent(id)}/dispute`, { reason });
  return parseSaleResponse(res.data);
}
