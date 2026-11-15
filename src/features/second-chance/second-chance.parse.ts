import { OFFER_STATUSES, type OfferDTO, type OfferStatus } from './second-chance.types';

// The ONLY place that maps second-chance API shapes (envelope `{ success, data }`).
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null ? (v as Obj) : {});
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const strOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export function parseOffer(raw: unknown): OfferDTO {
  const o = obj(raw);
  const a = obj(o.auction);
  const status: OfferStatus = OFFER_STATUSES.includes(o.status as OfferStatus) ? (o.status as OfferStatus) : 'PENDING';
  return {
    id: str(o.id),
    auctionId: str(o.auctionId, str(a.id)),
    auction: { id: str(a.id, str(o.auctionId)), title: str(a.title, 'Auction'), coverImage: strOrNull(a.coverImage) },
    amountPaise: num(o.amountPaise),
    status,
    expiresAt: str(o.expiresAt),
    respondedAt: strOrNull(o.respondedAt),
    newSaleId: strOrNull(o.newSaleId),
    createdAt: str(o.createdAt),
  };
}

/** One offer from `{ data: { offer } }` (also accepts the offer directly under `data`). */
export function parseOfferResponse(body: unknown): OfferDTO {
  const d = obj(obj(body).data);
  return parseOffer(typeof d.offer === 'object' && d.offer !== null ? d.offer : d);
}

export function parseOfferList(body: unknown): OfferDTO[] {
  const d = obj(obj(body).data);
  return (Array.isArray(d.items) ? d.items : []).map(parseOffer);
}

/** `POST /second-chance-offers/:id/accept` -> `{ offer, sale }` (bids-api sends `saleId`; either is accepted). */
export function parseAcceptResponse(body: unknown): { offer: OfferDTO; saleId: string | null } {
  const d = obj(obj(body).data);
  const offer = parseOffer(d.offer);
  const sale = obj(d.sale);
  return { offer, saleId: strOrNull(sale.id) ?? strOrNull(d.saleId) ?? offer.newSaleId };
}
