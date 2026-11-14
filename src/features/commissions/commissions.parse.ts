import { parsePaged, type Paged } from '@/lib/paged';
import type { CheckoutPayload, CommissionDTO, CommissionSummary } from './commissions.types';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null ? (v as Obj) : {});
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function parseCommission(raw: unknown): CommissionDTO {
  const c = obj(raw);
  const a = obj(c.auction);
  const status = c.status === 'PAID' || c.status === 'WAIVED' ? c.status : 'DUE';
  return {
    id: str(c.id),
    auctionId: str(c.auctionId, str(a.id)),
    auction: {
      id: str(a.id, str(c.auctionId)),
      title: str(a.title, 'Auction'),
      coverImage: strOrNull(a.coverImage),
      finalBidPaise: num(a.finalBidPaise),
      endedAt: strOrNull(a.endedAt),
    },
    rateBps: num(c.rateBps),
    amountPaise: num(c.amountPaise),
    status,
    dueAt: strOrNull(c.dueAt),
    paidAt: strOrNull(c.paidAt),
    createdAt: str(c.createdAt),
    isOverdue: c.isOverdue === true,
  };
}

export function parseCommissionPage(body: unknown): Paged<CommissionDTO> {
  const p = parsePaged<unknown>(body);
  return { items: p.items.map(parseCommission), meta: p.meta };
}

export function parseSummary(body: unknown): CommissionSummary {
  const d = obj(obj(body).data);
  return { unpaidPaise: num(d.unpaidPaise), dueCount: num(d.dueCount), overdueCount: num(d.overdueCount) };
}

export function parseCheckout(body: unknown): CheckoutPayload {
  const d = obj(obj(body).data);
  const p = obj(d.prefill);
  return {
    orderId: str(d.orderId),
    amountPaise: num(d.amountPaise),
    currency: str(d.currency, 'INR'),
    keyId: str(d.keyId),
    description: str(d.description, 'NobleBid commission'),
    prefill: { name: str(p.name) || undefined, email: str(p.email) || undefined, contact: str(p.contact) || undefined },
  };
}
