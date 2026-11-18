'use client';
import Link from 'next/link';
import { AlertCircle, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/empty-state';
import { ResponsiveList } from '@/components/common/responsive-list';
import { CoverImage } from '@/features/auctions/components/auction-card';
import { formatINR } from '@/lib/utils';
import { useMyOffers } from '../use-second-chance';
import type { OfferDTO } from '../second-chance.types';
import { OfferCountdown } from './offer-bits';

/** PENDING second-chance offers only: the "Offers" tab of /purchases lists them and shows their count. */
export function usePendingOffers() {
  const q = useMyOffers();
  return { ...q, pending: (q.data ?? []).filter((o) => o.status === 'PENDING') };
}

/**
 * The "Offers" tab of /purchases: pending offers. The offers API is not paged, so this feeds the shared
 * `ResponsiveList` (table on wide, cards on narrow) the whole list with no pagination bar.
 */
export function OffersList() {
  const { pending, isPending, isError, refetch } = usePendingOffers();
  if (isError) {
    return <EmptyState icon={AlertCircle} title="Could not load your offers" actionLabel="Try again" onAction={() => void refetch()} />;
  }
  const noop = () => undefined;
  return (
    <ResponsiveList<OfferDTO>
      desktop={{
        items: pending,
        isLoading: isPending,
        onPageChange: noop,
        renderTable: (items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Offer price</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-32">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="max-w-72">
                    <Link href={`/purchases/offers/${o.id}`} className="flex items-center gap-3 hover:underline">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        <CoverImage src={o.auction.coverImage} alt={o.auction.title} sizes="48px" />
                      </div>
                      <span className="line-clamp-2 font-medium">{o.auction.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tnum">{formatINR(o.amountPaise)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <OfferCountdown expiresAt={o.expiresAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm">
                      <Link href={`/purchases/offers/${o.id}`}>View offer</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ),
      }}
      mobile={{
        items: pending,
        isLoading: isPending,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: noop,
        renderCard: (o) => (
          <Card className="border-primary/30">
            <CardContent className="space-y-2 p-4">
              <Link href={`/purchases/offers/${o.id}`} className="flex items-center gap-3 hover:underline">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <CoverImage src={o.auction.coverImage} alt={o.auction.title} sizes="56px" />
                </div>
                <div className="min-w-0">
                  <p className="wrap-break-word font-medium">{o.auction.title}</p>
                  <p className="text-xs text-muted-foreground">The seller is offering you this item at your maximum bid.</p>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold tnum">{formatINR(o.amountPaise)}</span>
                <OfferCountdown expiresAt={o.expiresAt} />
              </div>
              <Button asChild size="sm">
                <Link href={`/purchases/offers/${o.id}`}>View offer</Link>
              </Button>
            </CardContent>
          </Card>
        ),
      }}
      empty={{ icon: Tag, title: 'No offers', description: 'When a seller offers you an item at your maximum bid, it shows up here.' }}
      getKey={(o) => o.id}
    />
  );
}
