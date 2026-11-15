import type { AuctionCard, AuctionCategory, AuctionDetail, AuctionPage, PageMeta } from './auctions.types';

// The ONLY place that knows where `serverTime` and the page meta live in a
// response. Backend shapes (src/core/http/response.ts):
//   ok():        { success, data }
//   paginated(): { success, data: T[], meta: { total,page,pageSize,totalPages | nextCursor }, ...extra }
// `serverTime` is looked up at top level (paginated `extra`), then `meta`, then
// inside `data` (object payloads). If the backend moves it, change it here.
// Kept free of axios/browser imports so server components can use it too.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;

function pickServerTime(body: unknown): string | null {
  if (!isObj(body)) return null;
  const candidates = [
    body.serverTime,
    isObj(body.meta) ? body.meta.serverTime : undefined,
    isObj(body.data) ? body.data.serverTime : undefined,
  ];
  const found = candidates.find((c): c is string => typeof c === 'string');
  return found ?? null;
}

export function parseAuctionPage(body: unknown): AuctionPage {
  const b = isObj(body) ? body : {};
  const items = Array.isArray(b.data) ? (b.data as AuctionCard[]) : [];
  const meta = (isObj(b.meta) ? b.meta : {}) as PageMeta;
  return { items, meta, serverTime: pickServerTime(body) };
}

export function parseAuctionDetail(body: unknown): { auction: AuctionDetail; serverTime: string | null } {
  const data = isObj(body) && isObj(body.data) ? body.data : {};
  return { auction: data.auction as AuctionDetail, serverTime: pickServerTime(body) };
}

export function parseCategories(body: unknown): AuctionCategory[] {
  const d = isObj(body) && isObj(body.data) ? body.data : {};
  return Array.isArray(d.categories) ? (d.categories as AuctionCategory[]) : [];
}

export function parseWritten(body: unknown): AuctionDetail {
  const d = isObj(body) && isObj(body.data) ? body.data : {};
  return d.auction as AuctionDetail;
}

/** `GET /auctions/:id/similar-sold` -> `{ items }` (inside the `data` envelope; a bare `{ items }` is tolerated). */
export function parseCardList(body: unknown): AuctionCard[] {
  const d = isObj(body) && isObj(body.data) ? body.data : isObj(body) ? body : {};
  return Array.isArray(d.items) ? (d.items as AuctionCard[]) : [];
}
