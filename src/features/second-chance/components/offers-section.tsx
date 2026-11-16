'use client';
import Link from 'next/link';
import { AlertCircle, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { CoverImage } from '@/features/auctions/components/auction-card';
import { formatINR } from '@/lib/utils';
import { useMyOffers } from '../use-second-chance';
import { OfferCountdown } from './offer-bits';

/** PENDING second-chance offers only: the "Offers" tab of /purchases lists them and shows their count. */
export function usePendingOffers() {
  const q = useMyOffers();
  return { ...q, pending: (q.data ?? []).filter((o) => o.status === 'PENDING') };
}

/** The "Offers" tab of /purchases: pending offers, with loading, error and empty states. */
export function OffersList() {
  const { pending, isPending, isError, refetch } = usePendingOffers();
  if (isPending) return <Skeleton className="h-24" />;
  if (isError) {
    return <EmptyState icon={AlertCircle} title="Could not load your offers" actionLabel="Try again" onAction={() => void refetch()} />;
  }
  if (pending.length === 0) {
    return <EmptyState icon={Tag} title="No offers" description="When a seller offers you an item at your maximum bid, it shows up here." />;
  }
  return (
    <ul className="space-y-3">
      {pending.map((o) => (
        <li key={o.id}>
          <Card className="border-primary/30">
            <CardContent className="flex flex-col gap-4 p-4 @lg/content:flex-row @lg/content:items-center">
              <Link href={`/purchases/offers/${o.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  <CoverImage src={o.auction.coverImage} alt={o.auction.title} sizes="64px" />
                </div>
                <div className="min-w-0">
                  <p className="wrap-break-word font-medium">{o.auction.title}</p>
                  <p className="text-xs text-muted-foreground">The seller is offering you this item at your maximum bid.</p>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-3 @lg/content:justify-end">
                <span className="font-semibold tnum">{formatINR(o.amountPaise)}</span>
                <OfferCountdown expiresAt={o.expiresAt} />
                <Button asChild size="sm">
                  <Link href={`/purchases/offers/${o.id}`}>View offer</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
