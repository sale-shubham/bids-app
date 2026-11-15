'use client';
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useStubPaymentConfirm } from '@/features/payments/use-stub-payment-confirm';
import { formatDate, formatINR } from '@/lib/utils';
import { saleErrorMessage } from '../sales.errors';
import { disputeSchema, type DisputeValues } from '../sales.schema';
import type { SaleDTO } from '../sales.types';
import { saleActions } from '../sales.utils';
import { useConfirmSale, useDisputeSale, useSalePayment } from '../use-sales';

export function DisputeDialog({ saleId, open, onOpenChange }: { saleId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const dispute = useDisputeSale(saleId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DisputeValues>({ resolver: zodResolver(disputeSchema), defaultValues: { reason: '' } });

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };
  const submit = handleSubmit((v) =>
    dispute.mutate(v.reason, {
      onSuccess: () => {
        toast.success('Problem reported. Our team will review it and the payment stays on hold.');
        close(false);
      },
      onError: (e) => toast.error(saleErrorMessage(e, 'Could not report the problem')),
    }),
  );

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={close}
      title="Report a problem"
      description="Tell us what went wrong. The payment stays on hold while our team reviews it."
      confirmLabel="Report problem"
      variant="destructive"
      loading={dispute.isPending}
      onConfirm={() => void submit()}
    >
      <div className="space-y-1.5">
        <Label htmlFor="dispute-reason">What went wrong?</Label>
        <Textarea id="dispute-reason" rows={5} maxLength={1000} aria-invalid={!!errors.reason} {...register('reason')} />
        {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
      </div>
    </ConfirmDialog>
  );
}

/** Buyer actions on /purchases/[id]: Pay, Confirm received, Report a problem. */
export function PurchaseActions({ sale }: { sale: SaleDTO }) {
  const { confirmStub, stubDialog } = useStubPaymentConfirm();
  const { pay, payingId } = useSalePayment(confirmStub);
  const confirm = useConfirmSale(sale.id);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [disputeOpen, setDisputeOpen] = React.useState(false);
  const a = saleActions(sale);

  if (!a.canPay && !a.payWindowClosed && !a.canConfirm && !a.canDispute) return null;

  const onConfirm = () =>
    confirm.mutate(undefined, {
      onSuccess: () => {
        toast.success('Thanks. The payment has been released to the seller.');
        setConfirmOpen(false);
      },
      onError: (e) => toast.error(saleErrorMessage(e, 'Could not confirm delivery')),
    });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {a.canPay && (
          <div className="flex flex-col gap-2 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
            <p className="text-sm text-muted-foreground">
              {sale.payBy ? `Pay by ${formatDate(sale.payBy)} to keep this item.` : 'Pay to complete your purchase.'}
            </p>
            <Button onClick={() => void pay(sale.id)} disabled={payingId !== null}>
              {payingId === sale.id && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Pay {formatINR(sale.amountPaise)}
            </Button>
          </div>
        )}
        {a.payWindowClosed && (
          <p className="text-sm text-destructive">The payment window for this purchase has closed.</p>
        )}
        {(a.canConfirm || a.canDispute) && (
          <div className="flex flex-wrap items-center gap-2">
            {a.canConfirm && <Button onClick={() => setConfirmOpen(true)}>Confirm received</Button>}
            {a.canDispute && (
              <Button variant="outline" onClick={() => setDisputeOpen(true)}>
                Report a problem
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm you received the item?"
        description="This releases the payment to the seller."
        confirmLabel="Confirm received"
        loading={confirm.isPending}
        onConfirm={onConfirm}
      />
      <DisputeDialog saleId={sale.id} open={disputeOpen} onOpenChange={setDisputeOpen} />
      {stubDialog}
    </Card>
  );
}
