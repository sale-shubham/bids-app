import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/common/page-header';
import { WatchlistView } from '@/features/watchlist/components/watchlist-view';

export const metadata: Metadata = { title: 'Watchlist — NobleBid', robots: { index: false } };

export default function WatchlistPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Watchlist" />
      <Suspense>
        <WatchlistView />
      </Suspense>
    </div>
  );
}
