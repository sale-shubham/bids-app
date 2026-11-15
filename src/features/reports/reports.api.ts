import { api } from '@/lib/api-client';
import { parsePaged, type Paged } from '@/lib/paged';
import type { AdminReport, AdminReportFilters, ReportInput, ResolveReportInput } from './reports.types';

export async function createReport(input: ReportInput): Promise<{ id: string; status: string }> {
  const res = await api.post('/reports', input);
  return res.data.data.report;
}

export async function fetchAdminReports(f: AdminReportFilters, page: number, pageSize: number): Promise<Paged<AdminReport>> {
  const params: Record<string, string | number> = { page, pageSize };
  // The API filters one status at a time: Open, or the chosen resolved outcome.
  params.status = f.tab === 'resolved' ? f.outcome : 'OPEN';
  if (f.targetType) params.targetType = f.targetType;
  const res = await api.get('/admin/reports', { params });
  const paged = parsePaged<AdminReport>(res.data);
  // Newest first from the API; HIGH priority floats to the top of the page (stable sort).
  return { ...paged, items: [...paged.items].sort((a, b) => Number(b.priority === 'HIGH') - Number(a.priority === 'HIGH')) };
}

export async function resolveReport({ id, ...body }: ResolveReportInput): Promise<{ resolvedCount: number }> {
  const res = await api.patch(`/admin/reports/${encodeURIComponent(id)}`, body);
  return { resolvedCount: Number(res.data.data.resolvedCount ?? 1) };
}
