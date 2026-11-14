'use client';
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfiniteScrollProps {
  /** Fetch the next page. Wired to react-query's `fetchNextPage`. */
  onLoadMore: () => void;
  /** react-query `hasNextPage`. */
  hasMore: boolean;
  /** react-query `isFetchingNextPage` — prevents duplicate loads while in-flight. */
  loading: boolean;
  /** Prefetch distance before the sentinel is fully visible. */
  rootMargin?: string;
  className?: string;
}

/**
 * IntersectionObserver sentinel for mobile card lists. Calls `onLoadMore()` when
 * it scrolls into view, provided there is more to load and a fetch isn't already
 * in flight. The desktop table uses `<ListPagination>` instead — this is the
 * mobile-only half of the dual pagination pattern (see docs/PAGINATION.md).
 */
export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onLoadMore,
  hasMore,
  loading,
  rootMargin = '200px',
  className,
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  // Always calls the latest callback without re-subscribing the observer
  // every render (an Effect Event, not a ref written during render).
  const loadMore = React.useEffectEvent(() => onLoadMore());

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) loadMore();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, rootMargin]);

  // Nothing left to load and not mid-fetch — render nothing (no dangling sentinel).
  if (!hasMore && !loading) return null;

  return (
    <div ref={ref} className={cn('flex justify-center py-4', className)} aria-hidden>
      {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
    </div>
  );
};

export default InfiniteScroll;
