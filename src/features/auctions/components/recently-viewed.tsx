'use client';
import * as React from 'react';
import { useRecentlyViewedStore } from '@/store/recently-viewed-store';
import { AuctionGrid } from './auction-grid';

// Client-only section: reads the persisted (localStorage) list after mount.
export function RecentlyViewed() {
  const items = useRecentlyViewedStore((s) => s.items);

  React.useEffect(() => {
    void useRecentlyViewedStore.persist.rehydrate();
  }, []);

  if (items.length === 0) return null;
  return (
    <section className="space-y-4" aria-labelledby="recently-viewed">
      <h2 id="recently-viewed" className="text-xl font-bold tracking-tight">
        Recently viewed
      </h2>
      <AuctionGrid auctions={items.slice(0, 4)} />
    </section>
  );
}
