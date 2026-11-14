import * as React from 'react';
import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/public-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { SITE_URL } from '@/lib/site';
import { AuctionFilterBar } from '@/features/auctions/components/auction-filters';
import { AuctionList } from '@/features/auctions/components/auction-list';
import { getAuctionPageServer } from '@/features/auctions/auctions.server';
import { parseFilters } from '@/features/auctions/auctions.filters';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category } = parseFilters(await searchParams);
  return {
    title: category ? `${category} auctions — NobleBid` : 'Browse auctions — NobleBid',
    description: category
      ? `Browse live, upcoming and ended ${category} auctions on NobleBid.`
      : 'Browse live, upcoming and ended auctions. Filter by category, condition and price.',
    alternates: { canonical: category ? `/auctions?category=${encodeURIComponent(category)}` : '/auctions' },
  };
}

// Public. The first page is fetched on the server (SEO + instant paint); the
// client list continues from there with infinite scroll.
export default async function AuctionsPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  const initialPage = await getAuctionPageServer(filters);

  // ItemList JSON-LD for the first page of results (`<` escaped so titles can never close the script tag).
  const ld = initialPage?.items.length
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: initialPage.items.map((a, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/auctions/${a.id}`,
          name: a.title,
        })),
      }).replace(/</g, '\\u003c')
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auctions</h1>
          <p className="text-muted-foreground">Find something you love and place your bid.</p>
        </div>
        <React.Suspense fallback={null}>
          <AuctionFilterBar />
        </React.Suspense>
        <AuctionList key={JSON.stringify(filters)} filters={filters} initialPage={initialPage} />
      </main>
      <SiteFooter />
    </div>
  );
}
