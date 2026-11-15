'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useRefundSale, useReleaseSale } from '@/features/admin/use-admin';
import { formatINR } from '@/lib/utils';
import { saleErrorMessage } from '../sales.errors';
import type { SaleDTO } from '../sales.types';
import { saleActions } from '../sales.utils';

/** Admin Release (pay the seller now) and Refund (return the money to the buyer, optional note) for one sale. */
export function AdminSaleActions({ sale }: { sale: SaleDTO }) {
  const release = useReleaseSale();
  const refund = useRefundSale();
  const [mode, setMode] = React.useState<'release' | 'refund' | null>(null);
  const [note, setNote] = React.useState('');
  const a = saleActions({ ...sale, role: 'ADMIN' });

  if (!a.canRelease && !a.canRefund) return null;

  const close = () => {
    setMode(null);
    setNote('');
  };
  const onRelease = () =>
    release.mutate(sale.id, {
      onSuccess: () => {
        toast.success('Payment released to the seller');
        close();
      },
      onError: (e) => toast.error(saleErrorMessage(e, 'Could not release the payment')),
    });
  const onRefund = () =>
    refund.mutate(
      { id: sale.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Payment refunded to the buyer');
          close();
        },
        onError: (e) => toast.error(saleErrorMessage(e, 'Could not refund the payment')),
      },
    );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {a.canRelease && (
          <Button size="sm" variant="outline" onClick={() => setMode('release')}>
            Release
          </Button>
        )}
        {a.canRefund && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setMode('refund')}>
            Refund
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={mode === 'release'}
        onOpenChange={(o) => !o && close()}
        title="Release this payment?"
        description={`${formatINR(sale.payoutPaise ?? sale.amountPaise)} will be paid out to ${sale.seller.name} for "${sale.auction.title}". This cannot be undone.`}
        confirmLabel="Release payment"
        loading={release.isPending}
        onConfirm={onRelease}
      />
      <ConfirmDialog
        open={mode === 'refund'}
        onOpenChange={(o) => !o && close()}
        title="Refund this payment?"
        description={`${formatINR(sale.amountPaise)} will be returned to ${sale.buyer.name} for "${sale.auction.title}". This cannot be undone.`}
        confirmLabel="Refund buyer"
        variant="destructive"
        loading={refund.isPending}
        onConfirm={onRefund}
      >
        <div className="space-y-1.5">
          <Label htmlFor={`refund-note-${sale.id}`}>Note (optional)</Label>
          <Textarea id={`refund-note-${sale.id}`} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this being refunded?" />
        </div>
      </ConfirmDialog>
    </>
  );
}
