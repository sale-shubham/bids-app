import { api } from '@/lib/api-client';
import { parseCheckout } from '@/features/commissions/commissions.parse';

/** `POST /auctions/:id/deposit/checkout`: same payload as the sale / commission checkout (`keyId === 'stub'` = test mode). */
export async function createDepositCheckout(auctionId: string) {
  const res = await api.post(`/auctions/${encodeURIComponent(auctionId)}/deposit/checkout`);
  const co = parseCheckout(res.data);
  return { ...co, description: co.description === 'NobleBid commission' ? 'NobleBid bid deposit' : co.description };
}

/** Admin: `PATCH /admin/auctions/:id/deposit` `{ depositPaise: number | null }`. */
export const setAuctionDeposit = (id: string, depositPaise: number | null) =>
  api.patch(`/admin/auctions/${encodeURIComponent(id)}/deposit`, { depositPaise }).then((r) => r.data.data);
