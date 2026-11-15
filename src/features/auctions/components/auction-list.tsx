'use client';
import * as React from 'react';
import { Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { useLiveStore } from '@/store/live-store';
import { auctionErrorMessage } from '../auctions.errors';
import type { AuctionFilters, AuctionPage } from '../auctions.types';
import { useAuctionsList } from '../use-auctions';
import { AuctionGrid, AuctionGridSkeleton } from './auction-grid';

// Client half of /auctions: shows the server-fetched first page instantly,
// then continues with infinite scroll. `filters` and `initialPage` come from
// the same searchParams on the server, so they always match.
export function AuctionList({
  filters,
  initialPage,
  emptyTitle = 'No auctions found',
  emptyDescription = 'Try a different search or clear some filters.',
  emptyActionLabel = 'Clear filters',
}: {
  filters: AuctionFilters;
  initialPage: AuctionPage | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
}) {
  const q = useAuctionsList(filters, initialPage);
  const syncServerTime = useLiveStore((s) => s.syncServerTime);
  const serverTime = initialPage?.serverTime;

  React.useEffect(() => {
    if (serverTime) syncServerTime(serverTime);
  }, [serverTime, syncServerTime]);

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  if (q.isPending) return <AuctionGridSkeleton />;

  if (q.isError && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <p className="font-medium">Could not load auctions</p>
        <p className="max-w-sm text-sm text-muted-foreground">{auctionErrorMessage(q.error)}</p>
        <Button variant="outline" onClick={() => void q.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Gavel}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        actionHref="/auctions"
      />
    );
  }

  return (
    <>
      <AuctionGrid auctions={items} />
      {q.isFetchNextPageError && (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={() => void q.fetchNextPage()}>
            Could not load more — retry
          </Button>
        </div>
      )}
      <InfiniteScroll
        onLoadMore={() => void q.fetchNextPage()}
        hasMore={!!q.hasNextPage && !q.isFetchNextPageError}
        loading={q.isFetchingNextPage}
      />
    </>
  );
}
