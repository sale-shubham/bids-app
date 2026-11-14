import { Heart } from 'lucide-react';
import { ComingSoon } from '@/components/common/coming-soon';

export default function WatchlistPage() {
  return (
    <ComingSoon
      icon={Heart}
      title="Watchlist"
      phase={2}
      description="Auctions you save will show up here with live countdowns."
    />
  );
}
