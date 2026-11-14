import { api } from '@/lib/api-client';

// Admin API client (bids-api src/modules/admin/). Phase 0 keeps only the
// member-management calls; dashboard / auctions / settings arrive in later phases.

export interface OffsetMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminMember {
  id: string;
  name: string | null;
  email: string;
  role: 'BIDDER' | 'AUCTIONEER' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
}

export async function fetchAdminMembers(
  params: { status?: 'active' | 'inactive'; search?: string; page?: number; pageSize?: number } = {},
) {
  const res = await api.get('/admin/members', { params });
  return res.data as { data: AdminMember[]; meta: OffsetMeta };
}

export const activateMember = (id: string) => api.post(`/admin/members/${id}/activate`).then((r) => r.data.data);
export const deactivateMember = (id: string) => api.post(`/admin/members/${id}/deactivate`).then((r) => r.data.data);
