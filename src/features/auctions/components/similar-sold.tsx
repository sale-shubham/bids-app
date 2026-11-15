'use client';
import { useSimilarSold } from '../use-auctions';
import { AuctionGrid } from './auction-grid';

// "Recently sold in this category" at the bottom of the detail page; renders nothing while loading, on error or when empty.
export function SimilarSold({ auctionId }: { auctionId: string }) {
  const { data } = useSimilarSold(auctionId);
  if (!data?.length) return null;
  return (
    <section className="space-y-3" aria-labelledby="similar-sold">
      <h2 id="similar-sold" className="text-lg font-semibold">
        Recently sold in this category
      </h2>
      <AuctionGrid auctions={data} />
    </section>
  );
}
