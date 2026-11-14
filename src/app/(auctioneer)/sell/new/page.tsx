import type { Metadata } from 'next';
import { AuctionForm } from '@/features/auctions/components/auction-form';

export const metadata: Metadata = { title: 'New auction — NobleBid' };

export default function NewAuctionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New auction</h1>
        <p className="text-muted-foreground">List an item and let bidders compete.</p>
      </div>
      <AuctionForm />
    </div>
  );
}
