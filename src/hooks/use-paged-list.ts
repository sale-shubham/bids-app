'use client';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { nextPagedParam, type Paged } from '@/lib/paged';
import { MOBILE_PAGE_SIZE } from '@/lib/pagination';
import { useIsNarrowContent } from '@/hooks/use-is-narrow-content';

export { MOBILE_PAGE_SIZE };

/**
 * Dual-pagination list (docs/PAGINATION.md): wide layouts run the offset
 * `useQuery`, narrow ones the infinite query; only one is enabled at a time.
 * Query keys: `[...key, 'list', filters, page, pageSize]` and `[...key, 'infinite', filters]`.
 */
export function usePagedList<T, F extends object>(
  key: readonly unknown[],
  filters: F,
  page: number,
  pageSize: number,
  fetcher: (f: F, page: number, pageSize: number) => Promise<Paged<T>>,
) {
  const narrow = useIsNarrowContent();
  const desktop = useQuery({
    queryKey: [...key, 'list', filters, page, pageSize],
    queryFn: () => fetcher(filters, page, pageSize),
    enabled: !narrow,
    placeholderData: keepPreviousData,
  });
  const mobile = useInfiniteQuery({
    queryKey: [...key, 'infinite', filters],
    queryFn: ({ pageParam }) => fetcher(filters, pageParam, MOBILE_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam<T>,
    enabled: narrow,
  });
  return {
    desktop,
    mobile,
    mobileItems: mobile.data?.pages.flatMap((p) => p.items) ?? [],
    error: (narrow ? mobile.error : desktop.error) as unknown,
    refetch: () => (narrow ? mobile.refetch() : desktop.refetch()),
  };
}

export type PagedListResult<T> = ReturnType<typeof usePagedList<T, never>>;
