import { parsePaged, type Paged } from '@/lib/paged';
import { SALE_STATUSES, type SaleContact, type SaleDTO, type SaleRole, type SaleStatus, type ShippingMethod } from './sales.types';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null ? (v as Obj) : {});
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function contact(v: unknown): SaleContact | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const c = obj(v);
  return { name: str(c.name), email: str(c.email), phone: str(c.phone) };
}

export function parseSale(raw: unknown): SaleDTO {
  const s = obj(raw);
  const a = obj(s.auction);
  const status: SaleStatus = SALE_STATUSES.includes(s.status as SaleStatus) ? (s.status as SaleStatus) : 'AWAITING_PAYMENT';
  const role: SaleRole = s.role === 'SELLER' || s.role === 'ADMIN' ? s.role : 'BUYER';
  const method: ShippingMethod | null = s.shippingMethod === 'COURIER' || s.shippingMethod === 'PICKUP' ? s.shippingMethod : null;
  const buyer = obj(s.buyer);
  const seller = obj(s.seller);
  const buyerContact = contact(s.buyerContact);
  const sellerContact = contact(s.sellerContact);
  return {
    id: str(s.id),
    auctionId: str(s.auctionId, str(a.id)),
    auction: { id: str(a.id, str(s.auctionId)), title: str(a.title, 'Auction'), coverImage: strOrNull(a.coverImage) },
    status,
    itemPaise: num(s.itemPaise),
    shippingFeePaise: num(s.shippingFeePaise),
    amountPaise: num(s.amountPaise),
    payBy: strOrNull(s.payBy),
    paidAt: strOrNull(s.paidAt),
    shippingMethod: method,
    courier: strOrNull(s.courier),
    trackingNo: strOrNull(s.trackingNo),
    shippedAt: strOrNull(s.shippedAt),
    deliveredAt: strOrNull(s.deliveredAt),
    releasedAt: strOrNull(s.releasedAt),
    disputedAt: strOrNull(s.disputedAt),
    disputeReason: strOrNull(s.disputeReason),
    refundedAt: strOrNull(s.refundedAt),
    cancelledAt: strOrNull(s.cancelledAt),
    createdAt: str(s.createdAt),
    role,
    buyer: { id: str(buyer.id), name: str(buyer.name) },
    seller: { id: str(seller.id), name: str(seller.name) },
    ...(typeof s.commissionPaise === 'number' ? { commissionPaise: s.commissionPaise } : {}),
    ...(typeof s.payoutPaise === 'number' ? { payoutPaise: s.payoutPaise } : {}),
    ...(buyerContact ? { buyerContact } : {}),
    ...(sellerContact ? { sellerContact } : {}),
  };
}

/** One sale from `{ data: SaleDTO }`. Also accepts `{ data: { sale } }` (action responses). */
export function parseSaleResponse(body: unknown): SaleDTO {
  const d = obj(obj(body).data);
  return parseSale(typeof d.sale === 'object' && d.sale !== null ? d.sale : d);
}

export function parseSalePage(body: unknown): Paged<SaleDTO> {
  const p = parsePaged<unknown>(body);
  return { items: p.items.map(parseSale), meta: p.meta };
}
