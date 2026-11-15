'use client';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { useAuthStore } from '@/store/auth-store';
import { reviewErrorMessage } from '../reviews.errors';
import { useSellerReviews } from '../use-reviews';
import { ReviewItem } from './review-item';

/** Paginated reviews on a seller page; the seller themself sees a Reply action on unanswered ones. */
export function SellerReviews({ sellerId }: { sellerId: string }) {
  const viewerId = useAuthStore((s) => s.member?.id);
  const list = useSellerReviews(sellerId);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="space-y-4" aria-labelledby="seller-reviews">
      <h2 id="seller-reviews" className="text-lg font-semibold">
        Reviews
      </h2>
      {list.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : list.isError && items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">{reviewErrorMessage(list.error, 'Could not load reviews')}</p>
          <Button variant="outline" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No reviews yet" description="Buyers can rate this seller after winning an auction." />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <ReviewItem key={r.id} review={r} canReply={viewerId === sellerId} />
          ))}
        </ul>
      )}
      <InfiniteScroll onLoadMore={() => void list.fetchNextPage()} hasMore={!!list.hasNextPage && !list.isFetchNextPageError} loading={list.isFetchingNextPage} />
    </section>
  );
}
