import { api } from '@/lib/api-client';
import { parsePaged, type Paged } from '@/lib/paged';
import type { AdminInvoice, InvoiceDTO, InvoiceSettings } from './invoices.types';

export const INVOICES_PAGE_SIZE = 20;

const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export async function fetchMyInvoices(page: number): Promise<Paged<InvoiceDTO>> {
  const res = await api.get('/invoices/mine', { params: { page, pageSize: INVOICES_PAGE_SIZE } });
  return parsePaged<InvoiceDTO>(res.data);
}

/** Short-lived download URL for an invoice PDF. */
export async function fetchInvoicePdfUrl(id: string): Promise<string> {
  const res = await api.get(`/invoices/${encodeURIComponent(id)}/pdf`);
  return String(res.data?.data?.url ?? '');
}

export async function fetchAdminInvoices(f: { type: string; q: string }, page: number, pageSize: number): Promise<Paged<AdminInvoice>> {
  const params: Record<string, string | number> = { page, pageSize };
  if (f.type) params.type = f.type;
  if (f.q) params.q = f.q;
  const res = await api.get('/admin/invoices', { params });
  return parsePaged<AdminInvoice>(res.data);
}

function parseSettings(body: unknown): InvoiceSettings {
  const d = obj(obj(body).data);
  return {
    legalName: str(d.legalName),
    gstin: str(d.gstin),
    address: str(d.address),
    stateCode: str(d.stateCode),
    gstRateBps: typeof d.gstRateBps === 'number' ? d.gstRateBps : 1800,
    commissionInclusive: d.commissionInclusive === true,
    sacCode: str(d.sacCode),
  };
}

export async function fetchInvoiceSettings() {
  return parseSettings((await api.get('/admin/settings/invoice')).data);
}

export async function saveInvoiceSettings(body: InvoiceSettings) {
  return parseSettings((await api.put('/admin/settings/invoice', body)).data);
}
