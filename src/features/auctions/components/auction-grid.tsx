import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AuctionCard as AuctionCardData } from '../auctions.types';
import { AuctionCard } from './auction-card';

const GRID = 'grid grid-cols-2 gap-3 @lg/content:gap-4 @2xl/content:grid-cols-3 @3xl/content:grid-cols-4';

export function AuctionGrid({ auctions, className }: { auctions: AuctionCardData[]; className?: string }) {
  return (
    <div className={cn(GRID, className)}>
      {auctions.map((a, i) => (
        <AuctionCard key={a.id} auction={a} priority={i < 4} />
      ))}
    </div>
  );
}

export function AuctionGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID} aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="aspect-4/3 w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
