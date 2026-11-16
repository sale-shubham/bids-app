'use client';
import { AlertCircle, Heart } from 'lucide-react';
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
      <EmptyState
        icon={AlertCircle}
        title="Could not load your watchlist"
        description={auctionErrorMessage(q.error)}
        actionLabel="Try again"
        onAction={() => void q.refetch()}
      />
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
