import { serverGet } from '@/lib/server-api';

export interface SellerProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  auctionsSold: number;
  activeAuctions: number;
}

/** Calls notFound() when the member does not exist. */
export async function getSellerServer(id: string): Promise<SellerProfile> {
  return serverGet<SellerProfile>(`/members/${encodeURIComponent(id)}/public`, { revalidate: 60 });
}
