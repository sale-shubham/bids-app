import { api } from '@/lib/api-client';
import { parseCheckout } from '@/features/commissions/commissions.parse';
import { parseSalePage, parseSaleResponse } from './sales.parse';
import type { SaleListRole, SaleStatus, ShipSaleInput, ShippingMethod } from './sales.types';

export async function fetchMySales(role: SaleListRole, status: SaleStatus | 'all', page: number, pageSize: number) {
  const params: Record<string, string | number> = { role, page, pageSize };
  if (status !== 'all') params.status = status;
  const res = await api.get('/sales/mine', { params });
  return parseSalePage(res.data);
}

export async function fetchSale(id: string) {
  const res = await api.get(`/sales/${encodeURIComponent(id)}`);
  return parseSaleResponse(res.data);
}

/** Same payload as `POST /commissions/:id/checkout` (stub mode when `keyId === 'stub'`). */
export async function createSaleCheckout(id: string, delivery?: ShippingMethod) {
  // `delivery` is required by the API when the auction offers both pickup and courier.
  const res = await api.post(`/sales/${encodeURIComponent(id)}/checkout`, delivery ? { delivery } : undefined);
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
