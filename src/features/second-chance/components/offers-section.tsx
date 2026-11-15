'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CoverImage } from '@/features/auctions/components/auction-card';
import { formatINR } from '@/lib/utils';
import { useMyOffers } from '../use-second-chance';
import { OfferCountdown } from './offer-bits';

/** "Offers" block at the top of /purchases: PENDING second-chance offers only (renders nothing when there are none). */
export function OffersSection() {
  const { data } = useMyOffers();
  const pending = (data ?? []).filter((o) => o.status === 'PENDING');
  if (pending.length === 0) return null;
  return (
    <section aria-labelledby="offers-heading" className="space-y-3">
      <h2 id="offers-heading" className="text-lg font-semibold">
        Offers
      </h2>
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
    </section>
  );
}
