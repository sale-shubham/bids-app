import * as React from 'react';
import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/public-header';
import { AuctionFilterBar } from '@/features/auctions/components/auction-filters';
import { AuctionList } from '@/features/auctions/components/auction-list';
import { getAuctionPageServer } from '@/features/auctions/auctions.server';
import { parseFilters } from '@/features/auctions/auctions.filters';

export const metadata: Metadata = {
  title: 'Browse auctions — NobleBid',
  description: 'Browse live, upcoming and ended auctions. Filter by category, condition and price.',
  alternates: { canonical: '/auctions' },
};

// Public. The first page is fetched on the server (SEO + instant paint); the
// client list continues from there with infinite scroll.
export default async function AuctionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const initialPage = await getAuctionPageServer(filters);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auctions</h1>
          <p className="text-muted-foreground">Find something you love and place your bid.</p>
        </div>
        <React.Suspense fallback={null}>
          <AuctionFilterBar />
        </React.Suspense>
        <AuctionList key={JSON.stringify(filters)} filters={filters} initialPage={initialPage} />
      </main>
    </div>
  );
}
