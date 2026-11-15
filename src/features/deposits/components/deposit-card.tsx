'use client';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStubPaymentConfirm } from '@/features/payments/use-stub-payment-confirm';
import type { AuctionDetail } from '@/features/auctions/auctions.types';
import { formatINR } from '@/lib/utils';
import { useDepositPayment } from '../use-deposit';

/** True when the viewer must pay a deposit before bidding (`deposit.requiredPaise > 0` and not HELD). */
export function needsDeposit(auction: Pick<AuctionDetail, 'deposit'>) {
  const d = auction.deposit;
  return !!d && d.requiredPaise > 0 && d.status !== 'HELD';
}

/** Small "Deposit paid" chip shown beside the bid controls once the deposit is HELD. */
export function DepositPaidChip({ auction }: { auction: Pick<AuctionDetail, 'deposit'> }) {
  const d = auction.deposit;
  if (!d || d.requiredPaise <= 0 || d.status !== 'HELD') return null;
  return (
    <Badge variant="success" className="gap-1">
      <ShieldCheck className="h-3 w-3" aria-hidden /> Deposit paid
    </Badge>
  );
}

/** Replaces the bid controls while a deposit is required: amount, one-line explanation, "Pay ₹X deposit". */
export function DepositCard({ auction }: { auction: Pick<AuctionDetail, 'id' | 'deposit'> }) {
  const { confirmStub, stubDialog } = useStubPaymentConfirm();
  const { pay, payingId } = useDepositPayment(confirmStub);
  const required = auction.deposit?.requiredPaise ?? 0;
  const paying = payingId === auction.id;

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="font-semibold">Refundable deposit required</p>
          <p className="text-2xl font-extrabold text-primary tnum">{formatINR(required)}</p>
          <p className="text-sm text-muted-foreground">Refunded automatically if you don&apos;t win. Forfeited only if you win and don&apos;t pay.</p>
        </div>
      </div>
      <Button type="button" className="w-full" disabled={paying} onClick={() => void pay(auction.id)}>
        {paying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Pay {formatINR(required)} deposit
      </Button>
      {stubDialog}
    </div>
  );
}
