// Decoding for the backend's paginated envelope:
//   { success, data: T[], meta: { total, page, pageSize, totalPages } }
// Shared by the bids and notifications features (auctions has its own because
// it also supports cursors).

export interface PagedMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  meta: PagedMeta;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export function parsePaged<T>(body: unknown): Paged<T> {
  const b = isObj(body) ? body : {};
  const items = Array.isArray(b.data) ? (b.data as T[]) : [];
  const m = isObj(b.meta) ? b.meta : {};
  return {
    items,
    meta: {
      total: num(m.total, items.length),
      page: num(m.page, 1),
      pageSize: num(m.pageSize, items.length),
      totalPages: num(m.totalPages, 1),
    },
  };
}

/** `getNextPageParam` for infinite queries over `Paged<T>`. */
export function nextPagedParam<T>(last: Paged<T>): number | undefined {
  return last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined;
}
