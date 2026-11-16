'use client';
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { ListPagination } from '@/components/common/list-pagination';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import type { OffsetMeta } from '@/lib/pagination';

interface DesktopConfig<T> {
  items: T[];
  isLoading: boolean;
  /** Offset envelope from the desktop `useQuery`; drives `ListPagination`. */
  meta?: OffsetMeta;
  onPageChange: (page: number) => void;
  /** Provide to show the rows-per-page selector. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Render the full `<Table>` (header + body) for the given rows. */
  renderTable: (items: T[]) => React.ReactNode;
  skeletonRows?: number;
}

interface MobileConfig<T> {
  items: T[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  /** Render one card for a row. */
  renderCard: (item: T) => React.ReactNode;
  skeletonCards?: number;
}

interface ResponsiveListProps<T> {
  desktop: DesktopConfig<T>;
  mobile: MobileConfig<T>;
  empty: { icon: LucideIcon; title: string; description: string };
  /** Stable key for each mobile card. */
  getKey: (item: T) => React.Key;
}

/**
 * App-standard responsive list. Wide (`hidden @3xl/content:block`): a
 * `<Card>`-wrapped table + offset `ListPagination`. Narrow
 * (`@3xl/content:hidden`): cards + infinite scroll. Owns the skeletons, empty
 * states, pagination bar and infinite-scroll sentinel, so pages only supply the
 * table markup and a card renderer. The two `items` arrays come from separate
 * hooks (offset `useQuery` vs `useInfiniteQuery`), each gated by
 * `useIsNarrowContent()` so exactly one fetches. See docs/PAGINATION.md.
 *
 * The switch is a **container** query on the content box, not the window:
 * with the sidebar open a desktop can leave the list far less than 768px, and
 * the table then scrolled sideways. `useIsNarrowContent()` measures the same
 * box at the same 48rem, so the query that runs always belongs to the layout
 * on screen — if the two ever disagreed, the visible half would be an empty
 * list claiming there is nothing there.
 */
export function ResponsiveList<T>({ desktop, mobile, empty, getKey }: ResponsiveListProps<T>) {
  const emptyState = (
    <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
  );

  return (
    <>
      {/* Desktop: offset-paginated table */}
      <div className="hidden @3xl/content:block">
        {!desktop.isLoading && !desktop.items.length ? (
          emptyState
        ) : (
          <Card>
            {desktop.isLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: desktop.skeletonRows ?? 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              desktop.renderTable(desktop.items)
            )}
            {!desktop.isLoading && desktop.meta && (
              <div className="border-t p-4">
                <ListPagination
                  total={desktop.meta.total}
                  currentPage={desktop.meta.page}
                  pageSize={desktop.meta.pageSize}
                  onPageChange={desktop.onPageChange}
                  onPageSizeChange={desktop.onPageSizeChange}
                  hideOnSinglePage
                />
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Mobile: infinite-scroll cards */}
      <div className="@3xl/content:hidden">
        {mobile.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: mobile.skeletonCards ?? 5 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : !mobile.items.length ? (
          emptyState
        ) : (
          <div className="space-y-3">
            {mobile.items.map((item) => (
              <React.Fragment key={getKey(item)}>{mobile.renderCard(item)}</React.Fragment>
            ))}
            <InfiniteScroll
              onLoadMore={mobile.fetchNextPage}
              hasMore={mobile.hasNextPage}
              loading={mobile.isFetchingNextPage}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default ResponsiveList;
