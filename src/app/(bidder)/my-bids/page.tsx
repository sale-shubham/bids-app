import { Trophy } from 'lucide-react';
import { ComingSoon } from '@/components/common/coming-soon';

export default function MyBidsPage() {
  return (
    <ComingSoon
      icon={Trophy}
      title="My bids"
      phase={3}
      description="Track the auctions you are winning, outbid on, won or lost."
    />
  );
}
