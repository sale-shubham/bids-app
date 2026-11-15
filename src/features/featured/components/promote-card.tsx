'use client';
import * as React from 'react';
import { Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useServerNow } from '@/components/common/countdown';
import { usePublicSettings } from '@/features/settings/use-settings';
import { useStubPaymentConfirm } from '@/features/payments/use-stub-payment-confirm';
import { useCreditBalance } from '@/features/referrals/use-referrals';
import { cn, formatDate, formatINR } from '@/lib/utils';
import { featuredErrorMessage } from '../featured.errors';
import { FEATURE_DAYS, type FeatureDays } from '../featured.types';
import { useAuctionFeature, usePromoteAuction } from '../use-featured';

/** Seller manage page: buy a paid promotion (Razorpay or credits) and see purchase history. Hidden when promotions are off or the auction ended. */
export function PromoteCard({ auctionId, status }: { auctionId: string; status: string }) {
  const settings = usePublicSettings();
  const closed = status === 'ENDED' || status === 'CANCELLED';
  const enabled = settings.data?.featuredEnabled === true && !closed;
  const feature = useAuctionFeature(auctionId, enabled);
  const balance = useCreditBalance();
  const now = useServerNow();
  const { confirmStub, stubDialog } = useStubPaymentConfirm();
  const promote = usePromoteAuction(auctionId, confirmStub);
  const [days, setDays] = React.useState<FeatureDays>(3);
  const [useCredits, setUseCredits] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (!enabled) return null;

  const prices = settings.data?.featuredPrices ?? {};
  const options = FEATURE_DAYS.filter((d) => typeof prices[String(d)] === 'number');
  const selected = options.includes(days) ? days : options[0];
  const price = selected ? prices[String(selected)] : 0;
  const canUseCredits = balance >= price && price > 0;
  const credits = useCredits && canUseCredits;
  const until = feature.data?.featuredUntil;
  const active = !!until && new Date(until).getTime() > now;
  const busy = promote.cardPaying || promote.payWithCredits.isPending;

  const runCredits = () => {
    if (!selected) return;
    promote.payWithCredits.mutate(selected, {
      onSuccess: () => {
        toast.success('Your auction is now promoted.');
        setConfirmOpen(false);
        setUseCredits(false);
      },
      onError: (e) => {
        toast.error(featuredErrorMessage(e));
        setConfirmOpen(false);
      },
    });
  };

  const onPay = () => {
    if (!selected) return;
    if (credits) setConfirmOpen(true);
    else void promote.payWithCard(selected);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" aria-hidden /> Promote this auction
        </CardTitle>
        <CardDescription>
          {active ? `Promoted until ${formatDate(until!)}` : 'Show it first, with a Promoted badge, in its category and on the home page.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Promotion prices are not set yet.</p>
        ) : (
          <>
            <div role="radiogroup" aria-label="Promotion length" className="grid grid-cols-3 gap-2">
              {options.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={selected === d}
                  onClick={() => setDays(d)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                    selected === d ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
                  )}
                >
                  <span className="block text-sm font-semibold">{d === 1 ? '1 day' : `${d} days`}</span>
                  <span className="block text-sm text-primary">{formatINR(prices[String(d)])}</span>
                </button>
              ))}
            </div>

            {canUseCredits && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={useCredits} onChange={(e) => setUseCredits(e.target.checked)} />
                Pay with credits (balance {formatINR(balance)})
              </label>
            )}

            <Button onClick={onPay} loading={busy} disabled={busy}>
              {credits ? `Pay ${formatINR(price)} with credits` : `Pay ${formatINR(price)}`}
            </Button>
          </>
        )}

        {!!feature.data?.purchases.length && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Purchase history</p>
            <ul className="divide-y text-sm">
              {feature.data.purchases.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {p.days === 1 ? '1 day' : `${p.days} days`} · {formatINR(p.amountPaise)}
                    {p.paidWith === 'CREDITS' ? ' (credits)' : ''}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={p.status === 'PAID' ? 'success' : 'secondary'}>{p.status.toLowerCase()}</Badge>
                    {formatDate(p.paidAt ?? p.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Pay with credits?"
        description={`${formatINR(price)} will be taken from your credit balance to promote this auction for ${selected} ${selected === 1 ? 'day' : 'days'}.`}
        confirmLabel="Pay with credits"
        loading={promote.payWithCredits.isPending}
        onConfirm={runCredits}
      />
      {stubDialog}
    </Card>
  );
}
