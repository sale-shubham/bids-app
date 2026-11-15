'use client';
import { AuctionGrid } from '@/features/auctions/components/auction-grid';
import { usePromoted } from '../use-featured';

/** Up to 2 promoted auctions above the results of a category browse. Renders nothing without a category or results. */
export function PromotedStrip({ category }: { category: string }) {
  const q = usePromoted(category);
  const items = q.data ?? [];
  if (!category || items.length === 0) return null;
  return (
    <section aria-label="Promoted auctions" className="space-y-3">
      <h2 className="text-lg font-semibold">Promoted</h2>
      <AuctionGrid auctions={items} />
    </section>
  );
}
