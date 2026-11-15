import { parsePaged, type Paged } from '@/lib/paged';
import type { RiskOutcome, RiskPerson, RiskSignal } from './risk.types';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null ? (v as Obj) : {});
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const strOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

const person = (v: unknown): RiskPerson => {
  const p = obj(v);
  return { id: str(p.id), name: str(p.name), email: str(p.email) };
};

export function parseRiskSignal(raw: unknown): RiskSignal {
  const r = obj(raw);
  const a = obj(r.auction);
  const outcome: RiskOutcome | null = r.outcome === 'DISMISSED' || r.outcome === 'ACTION_TAKEN' ? r.outcome : null;
  return {
    id: str(r.id),
    auction: { id: str(a.id), title: str(a.title, 'Auction') },
    bidder: person(r.bidder),
    seller: person(r.seller),
    score: num(r.score),
    reasons: Array.isArray(r.reasons) ? r.reasons.filter((x): x is string => typeof x === 'string') : [],
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
    reviewedAt: strOrNull(r.reviewedAt),
    outcome,
    note: strOrNull(r.note),
  };
}

export function parseRiskPage(body: unknown): Paged<RiskSignal> {
  const p = parsePaged<unknown>(body);
  return { items: p.items.map(parseRiskSignal), meta: p.meta };
}
