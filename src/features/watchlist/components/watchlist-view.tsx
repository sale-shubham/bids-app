'use client';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { AuctionGrid, AuctionGridSkeleton } from '@/features/auctions/components/auction-grid';
import { auctionErrorMessage } from '@/features/auctions/auctions.errors';
import { useWatchlist } from '../use-watchlist';

export function WatchlistView() {
  const q = useWatchlist();
  const items = q.data?.pages.flatMap((p) => p.items.map((e) => e.auction)) ?? [];

  if (q.isPending) return <AuctionGridSkeleton />;
  if (q.isError && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <p className="font-medium">Could not load your watchlist</p>
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
        icon={Heart}
        title="Nothing on your watchlist yet"
        description="Tap the heart on any auction to save it here. We will email you an hour before it ends."
        actionLabel="Browse auctions"
        actionHref="/auctions"
      />
    );
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
