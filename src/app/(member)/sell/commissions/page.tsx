'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ListToolbar } from '@/components/common/list-toolbar';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { PagedList } from '@/components/common/paged-list';
import { StatusBadge } from '@/components/common/status-badge';
import { StatusTabs } from '@/components/common/status-tabs';
import { useUrlState } from '@/features/admin/use-url-state';
import { CoverImage } from '@/features/auctions/components/auction-card';
import { useCommissions, useCommissionSummary } from '@/features/commissions/use-commissions';
import { useStubPaymentConfirm } from '@/features/payments/use-stub-payment-confirm';
import { usePayCommission } from '@/features/commissions/use-pay-commission';
import { commissionErrorMessage } from '@/features/commissions/commissions.errors';
import { useCreditBalance } from '@/features/referrals/use-referrals';
import type { CommissionDTO, CommissionTab } from '@/features/commissions/commissions.types';
import { formatDate, formatINR } from '@/lib/utils';

const TABS: { value: CommissionTab; label: string }[] = [
  { value: 'due', label: 'Due' },
  { value: 'paid', label: 'Paid' },
  { value: 'waived', label: 'Waived' },
  { value: 'all', label: 'All' },
];

const EMPTY: Record<CommissionTab, string> = {
  due: 'Nothing due. Commission appears here when one of your auctions sells.',
  paid: 'No paid commissions yet.',
  waived: 'No waived commissions.',
  all: 'No commissions yet. A 5% commission is created when one of your auctions sells.',
};

const dateOf = (c: CommissionDTO) => (c.status === 'PAID' ? c.paidAt : c.dueAt);
const dateText = (c: CommissionDTO) => {
  const v = dateOf(c);
  return `${c.status === 'PAID' ? 'Paid on' : 'Due date'} ${v ? formatDate(v) : '—'}`;
};

/** Credits checkbox (when the balance covers it) and the Pay button of one due commission. */
function PayControl({
  c,
  paying,
  disabled,
  balancePaise,
  onPay,
}: {
  c: CommissionDTO;
  paying: boolean;
  disabled: boolean;
  balancePaise: number;
  onPay: (useCredits: boolean) => void;
}) {
  const [useCredits, setUseCredits] = React.useState(false);
  if (c.status !== 'DUE') return null;
  const canUseCredits = balancePaise >= c.amountPaise;
  return (
    <div className="flex flex-wrap items-center gap-2 @3xl/content:justify-end">
      {canUseCredits && (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={useCredits} onChange={(e) => setUseCredits(e.target.checked)} />
          Pay with credits (balance {formatINR(balancePaise)})
        </label>
      )}
      <Button size="sm" onClick={() => onPay(canUseCredits && useCredits)} disabled={disabled}>
        {paying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Pay {formatINR(c.amountPaise)}
      </Button>
    </div>
  );
}

const DEFAULTS = { status: 'due' };

function CommissionsView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const tab = (TABS.find((t) => t.value === values.status)?.value ?? 'due') as CommissionTab;
  const list = useCommissions(tab, page, pageSize);
  const summary = useCommissionSummary();

  const { confirmStub, stubDialog } = useStubPaymentConfirm();
  const { pay, payingId, payWithCredits } = usePayCommission(confirmStub);
  const balance = useCreditBalance();
  const [creditTarget, setCreditTarget] = React.useState<CommissionDTO | null>(null);

  const confirmCredits = () => {
    if (!creditTarget) return;
    payWithCredits.mutate(creditTarget.id, {
      onSuccess: () => toast.success('Commission paid with credits.'),
      onError: (e) => toast.error(commissionErrorMessage(e)),
      onSettled: () => setCreditTarget(null),
    });
  };

  const s = summary.data;
  const unpaid = s?.unpaidPaise ?? 0;
  const payControl = (c: CommissionDTO) => (
    <PayControl
      c={c}
      paying={payingId === c.id}
      disabled={payingId !== null || payWithCredits.isPending}
      balancePaise={balance}
      onPay={(useCredits) => (useCredits ? setCreditTarget(c) : void pay(c.id))}
    />
  );
  const statusBadges = (c: CommissionDTO) => (
    <>
      {c.status === 'DUE' && c.isOverdue && <Badge variant="destructive">Overdue</Badge>}
      <StatusBadge status={c.status} />
    </>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Commissions" />

      {unpaid > 0 && (
        <Notice tone={(s?.overdueCount ?? 0) > 0 ? 'error' : 'warning'}>
          Total unpaid <strong className="tnum">{formatINR(unpaid)}</strong> across {s?.dueCount ?? 0} due {(s?.dueCount ?? 0) === 1 ? 'commission' : 'commissions'}
          {(s?.overdueCount ?? 0) > 0 && <>, {s?.overdueCount} overdue</>}. Pay it to create new auctions.
        </Notice>
      )}

      <ListToolbar tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ status: v })} />} />

      <PagedList<CommissionDTO>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(sz) => update({ pageSize: String(sz) })}
        getKey={(c) => c.id}
        errorTitle="Could not load commissions"
        empty={{ icon: Receipt, title: 'No commissions', description: EMPTY[tab] }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auction</TableHead>
                <TableHead className="text-right">Final price</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>
                  <span className="sr-only">Pay</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-64">
                    <Link href={`/auctions/${c.auction.id}`} className="flex items-center gap-3 hover:underline">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        <CoverImage src={c.auction.coverImage} alt={c.auction.title} sizes="48px" />
                      </div>
                      <span className="line-clamp-2 font-medium">{c.auction.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tnum">{formatINR(c.auction.finalBidPaise)}</TableCell>
                  <TableCell className="text-right tnum">{`${c.rateBps / 100}%`}</TableCell>
                  <TableCell className="text-right font-semibold tnum">{formatINR(c.amountPaise)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">{statusBadges(c)}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{dateText(c)}</TableCell>
                  <TableCell className="text-right">{payControl(c)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(c) => (
          <Card>
            <CardContent className="space-y-2 p-4">
              <Link href={`/auctions/${c.auction.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <CoverImage src={c.auction.coverImage} alt={c.auction.title} sizes="56px" />
                </div>
                <span className="min-w-0 font-medium wrap-break-word">{c.auction.title}</span>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {statusBadges(c)}
                <span className="text-sm text-muted-foreground">{dateText(c)}</span>
              </div>
              <p className="text-sm text-muted-foreground tnum">
                Final price {formatINR(c.auction.finalBidPaise)} · {`${c.rateBps / 100}%`} · <span className="font-semibold text-foreground">{formatINR(c.amountPaise)}</span>
              </p>
              {payControl(c)}
            </CardContent>
          </Card>
        )}
      />

      <ConfirmDialog
        open={!!creditTarget}
        onOpenChange={(o) => !o && setCreditTarget(null)}
        title="Pay with credits?"
        description={creditTarget ? `${formatINR(creditTarget.amountPaise)} will be taken from your credit balance to pay this commission.` : undefined}
        confirmLabel="Pay with credits"
        loading={payWithCredits.isPending}
        onConfirm={confirmCredits}
      />
      {stubDialog}
    </div>
  );
}

export default function SellCommissionsPage() {
  return (
    <Suspense>
      <CommissionsView />
    </Suspense>
  );
}
