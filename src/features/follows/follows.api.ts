import { api } from '@/lib/api-client';
import { parsePaged, type Paged } from '@/lib/paged';

export interface FollowState {
  following: boolean;
  followerCount: number;
}

export interface FollowedSeller {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  activeAuctions: number;
  followedAt: string;
}

export const FOLLOWING_PAGE_SIZE = 20;

/** The signed-in viewer's follow state for a seller, read off the public profile (`isFollowing` + `followerCount`). */
export async function fetchFollowState(sellerId: string): Promise<FollowState> {
  const res = await api.get(`/members/${encodeURIComponent(sellerId)}/public`);
  const d = res.data?.data ?? {};
  return { following: !!d.isFollowing, followerCount: typeof d.followerCount === 'number' ? d.followerCount : 0 };
}

export async function followSeller(sellerId: string): Promise<FollowState> {
  const res = await api.post(`/sellers/${encodeURIComponent(sellerId)}/follow`);
  return res.data.data;
}

export async function unfollowSeller(sellerId: string): Promise<FollowState> {
  const res = await api.delete(`/sellers/${encodeURIComponent(sellerId)}/follow`);
  return res.data.data;
}

export async function fetchFollowing(page: number): Promise<Paged<FollowedSeller>> {
  const res = await api.get('/members/me/following', { params: { page, pageSize: FOLLOWING_PAGE_SIZE } });
  return parsePaged<FollowedSeller>(res.data);
}
