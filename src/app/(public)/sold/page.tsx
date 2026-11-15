import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { AuctionList } from '@/features/auctions/components/auction-list';
import { getAuctionPageServer } from '@/features/auctions/auctions.server';
import { SOLD_FILTERS } from '@/features/auctions/auctions.filters';

export const metadata: Metadata = {
  title: 'Sold archive — NobleBid',
  description: 'See what recently sold on NobleBid and the prices it fetched. Past results help you value what you bid on and sell.',
  alternates: { canonical: '/sold' },
};

// Public sold archive: server-rendered first page of ended-with-a-winner auctions, newest sale first,
// then the same infinite-scroll list as /auctions.
export default async function SoldPage() {
  const initialPage = await getAuctionPageServer(SOLD_FILTERS);
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
      }).replace(/</g, '\u003c')
    : null;

  return (
    <div className="space-y-6">
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sold archive</h1>
        <p className="text-muted-foreground">Recently sold items and the prices they reached.</p>
      </div>
      <AuctionList filters={SOLD_FILTERS} initialPage={initialPage} emptyTitle="Nothing sold yet" emptyDescription="Sold auctions will appear here." emptyActionLabel="Browse auctions" />
    </div>
  );
}
