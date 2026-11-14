// Shared pagination primitives for the responsive dual-pagination pattern
// (desktop offset table + mobile infinite-scroll cards). See docs/PAGINATION.md.

/** Batch size for mobile infinite-scroll queries (`useInfiniteQuery`). */
export const MOBILE_PAGE_SIZE = 100;

/** Offset-pagination envelope returned by every paginated backend list. */
export interface OffsetMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * `getNextPageParam` for offset-envelope infinite queries: advance to the next
 * page while one remains, else return undefined (stops `fetchNextPage`).
 */
export const nextOffsetPage = (lastPage: { meta: OffsetMeta }) =>
  lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined;
