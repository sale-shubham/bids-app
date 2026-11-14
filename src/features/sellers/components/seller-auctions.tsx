'use client';
import * as React from 'react';
import { Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { AuctionGrid, AuctionGridSkeleton } from '@/features/auctions/components/auction-grid';
import { auctionErrorMessage } from '@/features/auctions/auctions.errors';
import { BROWSE_STATUSES, DEFAULT_FILTERS } from '@/features/auctions/auctions.filters';
import type { AuctionFilters, AuctionSort, BrowseStatus } from '@/features/auctions/auctions.types';
import { useAuctionsList } from '@/features/auctions/use-auctions';

const SORT: Record<BrowseStatus, AuctionSort> = { live: 'endingSoon', upcoming: 'endingSoon', ended: 'newest' };

function TabPanel({ sellerId, status }: { sellerId: string; status: BrowseStatus }) {
  const filters: AuctionFilters = React.useMemo(
    () => ({ ...DEFAULT_FILTERS, status, sort: SORT[status], sellerId }),
    [sellerId, status],
  );
  const q = useAuctionsList(filters);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  if (q.isPending) return <AuctionGridSkeleton count={4} />;
  if (q.isError && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">{auctionErrorMessage(q.error)}</p>
        <Button variant="outline" onClick={() => void q.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (items.length === 0) {
    return <EmptyState icon={Gavel} title={`No ${status} auctions`} description="Check the other tabs or come back later." />;
  }
  return (
    <>
      <AuctionGrid auctions={items} />
      <InfiniteScroll
        onLoadMore={() => void q.fetchNextPage()}
        hasMore={!!q.hasNextPage && !q.isFetchNextPageError}
        loading={q.isFetchingNextPage}
      />
    </>
  );
}

// Live / Upcoming / Ended tabs; only the active tab fetches.
export function SellerAuctions({ sellerId }: { sellerId: string }) {
  const [tab, setTab] = React.useState<BrowseStatus>('live');
  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as BrowseStatus)}>
        <TabsList>
          {BROWSE_STATUSES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <TabPanel key={tab} sellerId={sellerId} status={tab} />
    </div>
  );
}
