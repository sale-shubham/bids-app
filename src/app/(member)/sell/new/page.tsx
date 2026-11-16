import * as React from 'react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { NewAuction } from '@/features/auctions/components/new-auction';

export const metadata: Metadata = { title: 'New auction — NobleBid' };

export default function NewAuctionPage() {
  // Same width as the form (max-w-3xl) so the title and the form line up.
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="New auction" backHref="/sell/auctions" backLabel="Back to my auctions" />
      <React.Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewAuction />
      </React.Suspense>
    </div>
  );
}
