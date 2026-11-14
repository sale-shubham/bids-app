import { Store } from 'lucide-react';
import { ComingSoon } from '@/components/common/coming-soon';

export default function SellAuctionsPage() {
  return (
    <ComingSoon
      icon={Store}
      title="My auctions"
      phase={2}
      description="Create and manage your auctions here."
    />
  );
}
