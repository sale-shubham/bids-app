'use client';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth-store';
import { useAuction } from '../use-auctions';
import { AuctionForm } from './auction-form';

/** `/sell/new`: a blank form, or pre-filled from `?from=<auctionId>` (relist) when the viewer is that auction's seller. */
export function NewAuction() {
  const from = useSearchParams().get('from');
  return from ? <RelistLoader from={from} /> : <AuctionForm />;
}

function RelistLoader({ from }: { from: string }) {
  const { data, isPending } = useAuction(from);
  const member = useAuthStore((s) => s.member);
  const initialized = useAuthStore((s) => s.initialized);
  if (isPending || !initialized) return <Skeleton className="h-96 w-full" />;
  // Not the seller (or not loadable): fall back to a blank form instead of leaking another seller's listing.
  const relistFrom = data && member && data.seller.id === member.id ? data : undefined;
  return <AuctionForm relistFrom={relistFrom} />;
}
