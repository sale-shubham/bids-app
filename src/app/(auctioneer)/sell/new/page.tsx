import * as React from 'react';
import type { Metadata } from 'next';
import { Skeleton } from '@/components/ui/skeleton';
import { NewAuction } from '@/features/auctions/components/new-auction';

export const metadata: Metadata = { title: 'New auction — NobleBid' };

export default function NewAuctionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New auction</h1>
        <p className="text-muted-foreground">List an item and let bidders compete.</p>
      </div>
      <React.Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewAuction />
      </React.Suspense>
    </div>
  );
}
