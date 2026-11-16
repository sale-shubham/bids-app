'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { CoverImage } from '@/features/auctions/components/auction-card';
import { apiErrorCode } from '@/lib/api-client';
import { formatDate, formatINR } from '@/lib/utils';
import { isStaleOfferError, offerErrorMessage } from '../second-chance.errors';
import { useAcceptOffer, useDeclineOffer, useOffer } from '../use-second-chance';
import { OfferCountdown, OfferStatusBadge, useOfferRemainingMs } from './offer-bits';

/** /purchases/offers/[id]: the offer, a countdown, Accept and Decline. */
export function OfferDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: offer, isPending, error, refetch } = useOffer(id);
  const accept = useAcceptOffer(id);
  const decline = useDeclineOffer(id);
  const [dialog, setDialog] = React.useState<'accept' | 'decline' | null>(null);
  const remaining = useOfferRemainingMs(offer?.expiresAt ?? '');

  const onError = (e: unknown, fallback: string) => {
    toast.error(offerErrorMessage(e, fallback));
    if (isStaleOfferError(e)) void refetch();
    setDialog(null);
  };

  const confirmAccept = () =>
    accept.mutate(undefined, {
      onSuccess: ({ saleId }) => {
        toast.success('Offer accepted. Pay within 3 days to complete the purchase.');
        setDialog(null);
        router.push(saleId ? `/purchases/${saleId}` : '/purchases');
      },
      onError: (e) => onError(e, 'Could not accept the offer'),
    });

  const confirmDecline = () =>
    decline.mutate(undefined, {
      onSuccess: () => {
        toast.success('Offer declined');
        setDialog(null);
      },
      onError: (e) => onError(e, 'Could not decline the offer'),
    });

  const expired = !!offer && (offer.status === 'EXPIRED' || (offer.status === 'PENDING' && remaining === 0));
  const actionable = !!offer && offer.status === 'PENDING' && !expired;

  return (
    <div className="space-y-4">
      <PageHeader title="Second-chance offer" backHref="/purchases?tab=offers" backLabel="Back to purchases" />

      {isPending ? (
        <Skeleton className="h-48" />
      ) : error || !offer ? (
        <EmptyState
          icon={Tag}
          title={apiErrorCode(error) === 'OFFER_NOT_FOUND' ? 'Not found' : 'Could not load this offer'}
          description={offerErrorMessage(error, 'Please try again.')}
          {...(apiErrorCode(error) === 'OFFER_NOT_FOUND' ? { actionLabel: 'Purchases', actionHref: '/purchases' } : { actionLabel: 'Try again', onAction: () => void refetch() })}
        />
      ) : (
        <Card>
          <CardContent className="space-y-4 p-4">
            <Link href={`/auctions/${offer.auction.id}`} className="flex items-center gap-3 hover:underline">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                <CoverImage src={offer.auction.coverImage} alt={offer.auction.title} sizes="80px" />
              </div>
              <p className="min-w-0 wrap-break-word text-lg font-semibold">{offer.auction.title}</p>
            </Link>
            <p className="text-sm text-muted-foreground">
              The winner did not pay, so the seller is offering you this item at your maximum bid.
            </p>
            <dl className="grid gap-3 text-sm @lg/content:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Price</dt>
                <dd className="text-lg font-semibold tnum">{formatINR(offer.amountPaise)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  <OfferStatusBadge status={expired ? 'EXPIRED' : offer.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{offer.status === 'PENDING' ? 'Expires' : 'Offered'}</dt>
                <dd>{offer.status === 'PENDING' ? <OfferCountdown expiresAt={offer.expiresAt} /> : formatDate(offer.createdAt)}</dd>
              </div>
            </dl>

            {actionable && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => setDialog('accept')}>
                  Accept offer
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialog('decline')}>
                  Decline
                </Button>
              </div>
            )}
            {expired && <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">This offer has expired.</p>}
            {offer.status === 'DECLINED' && <p className="text-sm text-muted-foreground">You declined this offer.</p>}
            {offer.status === 'ACCEPTED' && (
              <Button asChild>
                <Link href={offer.newSaleId ? `/purchases/${offer.newSaleId}` : '/purchases'}>View purchase</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={dialog === 'accept'}
        onOpenChange={(o) => !o && !accept.isPending && setDialog(null)}
        title="Accept this offer?"
        description={offer ? `You agree to buy this for ${formatINR(offer.amountPaise)}. Pay within 3 days.` : undefined}
        confirmLabel={offer ? `Buy for ${formatINR(offer.amountPaise)}` : 'Accept'}
        loading={accept.isPending}
        onConfirm={confirmAccept}
      />
      <ConfirmDialog
        open={dialog === 'decline'}
        onOpenChange={(o) => !o && !decline.isPending && setDialog(null)}
        title="Decline this offer?"
        description="The seller will be told you are not interested. This cannot be undone."
        confirmLabel="Decline"
        variant="destructive"
        loading={decline.isPending}
        onConfirm={confirmDecline}
      />
    </div>
  );
}
