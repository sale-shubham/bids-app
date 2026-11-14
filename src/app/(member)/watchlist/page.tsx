import type { Metadata } from 'next';
import { WatchlistView } from '@/features/watchlist/components/watchlist-view';

export const metadata: Metadata = { title: 'Watchlist — NobleBid', robots: { index: false } };

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-muted-foreground">Auctions you are keeping an eye on.</p>
      </div>
      <WatchlistView />
    </div>
  );
}
