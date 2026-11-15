import { api } from '@/lib/api-client';
import type { Paged } from '@/lib/paged';
import { parseSalePage, parseSaleResponse } from '@/features/sales/sales.parse';
import type { SaleDTO } from '@/features/sales/sales.types';
import type { Role } from '@/constants/routes';
import {
  parseAuctionAdminPage,
  parseCommissionAdminPage,
  parseDashboard,
  parseLegal,
  parseMemberPage,
  parsePaymentPage,
  parseSettings,
} from './admin.parse';
import type {
  AdminAuction,
  AdminCommission,
  AdminMember,
  AdminPayment,
  AdminSettings,
  LegalSlug,
  MemberFilters,
} from './admin.types';

// Admin API client (bids-api src/modules/admin/). SUPER_ADMIN only.

type Q = Record<string, string | number | undefined>;
const clean = (p: Q): Q => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined));
const noAll = (s: string) => (s === 'all' ? '' : s);

export async function fetchDashboard() {
  const res = await api.get('/admin/dashboard');
  return parseDashboard(res.data);
}

export async function fetchMembers(f: MemberFilters, page: number, pageSize: number): Promise<Paged<AdminMember>> {
  const res = await api.get('/admin/members', { params: clean({ ...f, page, pageSize }) });
  return parseMemberPage(res.data);
}

export const updateMember = (id: string, body: { isActive?: boolean; role?: Role; verified?: boolean }) =>
  api.patch(`/admin/members/${id}`, body).then((r) => r.data.data);

export async function fetchAdminAuctions(
  f: { status: string; q: string },
  page: number,
  pageSize: number,
): Promise<Paged<AdminAuction>> {
  const res = await api.get('/admin/auctions', { params: clean({ status: noAll(f.status), q: f.q, page, pageSize }) });
  return parseAuctionAdminPage(res.data);
}

export const cancelAuction = (id: string) => api.delete(`/auctions/${id}`).then((r) => r.data.data);

export async function fetchAdminCommissions(
  f: { status: string },
  page: number,
  pageSize: number,
): Promise<Paged<AdminCommission>> {
  const res = await api.get('/admin/commissions', { params: { status: f.status, page, pageSize } });
  return parseCommissionAdminPage(res.data);
}

export const waiveCommission = (id: string) => api.post(`/admin/commissions/${id}/waive`).then((r) => r.data.data);

export async function fetchAdminPayments(
  f: { status: string },
  page: number,
  pageSize: number,
): Promise<Paged<AdminPayment>> {
  const res = await api.get('/admin/payments', { params: clean({ status: noAll(f.status), page, pageSize }) });
  return parsePaymentPage(res.data);
}

export async function fetchAdminSales(f: { status: string; q: string }, page: number, pageSize: number): Promise<Paged<SaleDTO>> {
  const res = await api.get('/admin/sales', { params: clean({ status: noAll(f.status), q: f.q, page, pageSize }) });
  return parseSalePage(res.data);
}

export const releaseSale = (id: string) => api.post(`/admin/sales/${encodeURIComponent(id)}/release`).then((r) => parseSaleResponse(r.data));

export const refundSale = (id: string, note?: string) =>
  api.post(`/admin/sales/${encodeURIComponent(id)}/refund`, note ? { note } : {}).then((r) => parseSaleResponse(r.data));

export async function fetchSettings() {
  const res = await api.get('/admin/settings');
  return parseSettings(res.data);
}

export async function saveSettings(body: AdminSettings) {
  const res = await api.put('/admin/settings', body);
  return parseSettings(res.data);
}

export async function fetchLegal(slug: LegalSlug) {
  const res = await api.get(`/settings/legal/${slug}`);
  return parseLegal(res.data, slug);
}

export async function saveLegal(slug: LegalSlug, body: { title: string; content: string }) {
  const res = await api.put(`/admin/settings/legal/${slug}`, body);
  return parseLegal(res.data, slug);
}
