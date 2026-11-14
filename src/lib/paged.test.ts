import { describe, expect, it } from 'vitest';
import { nextPagedParam, parsePaged } from './paged';

describe('parsePaged', () => {
  it('reads items and meta from the envelope', () => {
    const p = parsePaged<{ id: number }>({ data: [{ id: 1 }], meta: { total: 30, page: 2, pageSize: 10, totalPages: 3 } });
    expect(p.items).toEqual([{ id: 1 }]);
    expect(p.meta).toEqual({ total: 30, page: 2, pageSize: 10, totalPages: 3 });
  });
  it('falls back safely on junk', () => {
    for (const body of [null, undefined, 'x', 5, {}, { data: 'nope', meta: 3 }]) {
      const p = parsePaged(body);
      expect(p.items).toEqual([]);
      expect(p.meta).toEqual({ total: 0, page: 1, pageSize: 0, totalPages: 1 });
    }
  });
  it('defaults total/pageSize to the item count and ignores non-finite numbers', () => {
    const p = parsePaged({ data: [1, 2, 3], meta: { total: Number.NaN, page: 'x' } });
    expect(p.meta).toMatchObject({ total: 3, page: 1, pageSize: 3, totalPages: 1 });
  });
  it('nextPagedParam returns the next page until the last', () => {
    const mk = (page: number, totalPages: number) => ({ items: [], meta: { total: 0, page, pageSize: 10, totalPages } });
    expect(nextPagedParam(mk(1, 3))).toBe(2);
    expect(nextPagedParam(mk(3, 3))).toBeUndefined();
  });
});
