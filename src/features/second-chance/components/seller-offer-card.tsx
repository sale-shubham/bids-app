'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { formatDate, formatINR } from '@/lib/utils';
import type { SaleDTO } from '@/features/sales/sales.types';
import { isStaleOfferError, offerErrorMessage } from '../second-chance.errors';
import { useInvalidateOffers, useOfferSecondChance } from '../use-second-chance';
import { OfferCountdown, OfferStatusBadge } from './offer-bits';

/**
 * Seller side of a CANCELLED sale (`/sell/sales/[id]`): "Offer to the runner-up" when
 * `canOfferSecondChance`, otherwise the status of the offer already made.
 */
export function SellerOfferCard({ sale }: { sale: SaleDTO }) {
  const offer = sale.secondChanceOffer ?? null;
  const create = useOfferSecondChance(sale.id);
  const invalidate = useInvalidateOffers();
  const [open, setOpen] = React.useState(false);

  if (!offer && !sale.canOfferSecondChance) return null;

  const confirm = () =>
    create.mutate(undefined, {
      onSuccess: () => {
        toast.success('Offer sent to the runner-up');
        setOpen(false);
      },
      onError: (e) => {
        toast.error(offerErrorMessage(e, 'Could not send the offer'));
        if (isStaleOfferError(e)) invalidate();
        setOpen(false);
      },
    });

  return (
    <>
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="font-semibold">Second chance</p>
          {offer ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <OfferStatusBadge status={offer.status} />
                <span className="font-semibold tnum">{formatINR(offer.amountPaise)}</span>
                {offer.status === 'PENDING' && <OfferCountdown expiresAt={offer.expiresAt} />}
              </div>
              <p className="text-muted-foreground">
                {offer.status === 'PENDING' && `Offered to the runner-up on ${formatDate(offer.createdAt)}. They have until ${formatDate(offer.expiresAt)} to accept.`}
                {offer.status === 'ACCEPTED' && 'The runner-up accepted. A new sale was created for this item.'}
                {offer.status === 'DECLINED' && 'The runner-up declined the offer.'}
                {offer.status === 'EXPIRED' && 'The offer expired without an answer.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">The buyer did not pay. You can offer this item to the next-highest bidder instead.</p>
              <Button type="button" onClick={() => setOpen(true)}>
                Offer to the runner-up
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => !o && !create.isPending && setOpen(false)}
        title="Offer to the runner-up?"
        description={`This offers "${sale.auction.title}" to the next-highest bidder at their maximum bid. The offer is valid for 48 hours.`}
        confirmLabel="Send offer"
        loading={create.isPending}
        onConfirm={confirm}
      />
    </>
  );
}
