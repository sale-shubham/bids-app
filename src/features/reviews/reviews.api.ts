import { api } from '@/lib/api-client';
import { parsePaged, type Paged } from '@/lib/paged';
import type { AdminReview, AdminReviewFilters, ReviewDTO } from './reviews.types';

export const REVIEWS_PAGE_SIZE = 10;

export async function createReview(auctionId: string, body: { rating: number; comment?: string }): Promise<ReviewDTO> {
  const res = await api.post(`/auctions/${encodeURIComponent(auctionId)}/review`, body);
  return res.data.data.review as ReviewDTO;
}

export async function replyToReview(reviewId: string, reply: string): Promise<ReviewDTO> {
  const res = await api.post(`/reviews/${encodeURIComponent(reviewId)}/reply`, { reply });
  return res.data.data.review as ReviewDTO;
}

export async function fetchSellerReviews(sellerId: string, page: number): Promise<Paged<ReviewDTO>> {
  const res = await api.get(`/members/${encodeURIComponent(sellerId)}/reviews`, {
    params: { page, pageSize: REVIEWS_PAGE_SIZE },
  });
  return parsePaged<ReviewDTO>(res.data);
}

export async function fetchAdminReviews(f: AdminReviewFilters, page: number, pageSize: number): Promise<Paged<AdminReview>> {
  const params: Record<string, string | number> = { page, pageSize };
  if (f.visibility === 'hidden') params.hidden = 'true';
  if (f.visibility === 'visible') params.hidden = 'false';
  if (f.q) params.q = f.q;
  const res = await api.get('/admin/reviews', { params });
  return parsePaged<AdminReview>(res.data);
}

export async function setReviewHidden(id: string, hidden: boolean): Promise<AdminReview> {
  const res = await api.patch(`/admin/reviews/${encodeURIComponent(id)}`, { hidden });
  return res.data.data.review as AdminReview;
}
