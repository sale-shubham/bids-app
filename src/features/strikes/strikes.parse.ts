import type { StrikeDTO } from './strikes.types';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null ? (v as Obj) : {});
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const strOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);

export function parseStrike(raw: unknown): StrikeDTO {
  const s = obj(raw);
  const a = obj(s.auction);
  const removedAt = strOrNull(s.removedAt);
  const expiresAt = str(s.expiresAt);
  const expired = expiresAt !== '' && new Date(expiresAt).getTime() <= Date.now();
  return {
    id: str(s.id),
    saleId: strOrNull(s.saleId),
    auction: typeof s.auction === 'object' && s.auction !== null ? { id: str(a.id), title: str(a.title, 'Auction') } : null,
    reason: 'UNPAID',
    createdAt: str(s.createdAt),
    expiresAt,
    removedAt,
    note: strOrNull(s.note),
    active: typeof s.active === 'boolean' ? s.active : !removedAt && !expired,
  };
}

/** `GET /admin/members/:id/strikes` -> `{ items }`. */
export function parseStrikeList(body: unknown): StrikeDTO[] {
  const d = obj(obj(body).data);
  return (Array.isArray(d.items) ? d.items : []).map(parseStrike);
}
