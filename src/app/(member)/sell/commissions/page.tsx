'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, Loader2, Receipt, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { Figure, FigureStrip } from '@/components/common/figure';
import { ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { StatusBadge } from '@/components/common/status-badge';
import { StatusTabs } from '@/features/admin/components/admin-list';
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

function CommissionRow({
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
  const canUseCredits = c.status === 'DUE' && balancePaise >= c.amountPaise;
  const dateLabel = c.status === 'PAID' ? 'Paid on' : 'Due date';
  const dateValue = c.status === 'PAID' ? c.paidAt : c.dueAt;
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 @lg/content:flex-row @lg/content:items-center">
        <Link href={`/auctions/${c.auction.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            <CoverImage src={c.auction.coverImage} alt={c.auction.title} sizes="64px" />
          </div>
          <span className="min-w-0 wrap-break-word font-medium">{c.auction.title}</span>
        </Link>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm @lg/content:flex @lg/content:items-center">
          <div>
            <dt className="text-xs text-muted-foreground">Final price</dt>
            <dd>{formatINR(c.auction.finalBidPaise)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rate</dt>
            <dd>{`${c.rateBps / 100}%`}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Commission</dt>
            <dd className="font-semibold">{formatINR(c.amountPaise)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{dateLabel}</dt>
            <dd>{dateValue ? formatDate(dateValue) : '—'}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2 @lg/content:justify-end">
          {c.status === 'DUE' && c.isOverdue && <Badge variant="destructive">Overdue</Badge>}
          <StatusBadge status={c.status} />
          {canUseCredits && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={useCredits} onChange={(e) => setUseCredits(e.target.checked)} />
              Pay with credits (balance {formatINR(balancePaise)})
            </label>
          )}
          {c.status === 'DUE' && (
            <Button size="sm" onClick={() => onPay(canUseCredits && useCredits)} disabled={disabled}>
              {paying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Pay {formatINR(c.amountPaise)}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const DEFAULTS = { status: 'due' };

function CommissionsView() {
  const { values, update } = useUrlState(DEFAULTS);
  const tab = (TABS.find((t) => t.value === values.status)?.value ?? 'due') as CommissionTab;
  const list = useCommissions(tab);
  const summary = useCommissionSummary();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

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

  return (
    <div className="space-y-4">
      <PageHeader title="Commissions" />

      {summary.isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : (
        <FigureStrip cols={3}>
          <Figure label="Total unpaid" value={formatINR(s?.unpaidPaise ?? 0)} icon={Wallet} tone="warning" attention={(s?.unpaidPaise ?? 0) > 0} />
          <Figure label="Due" value={s?.dueCount ?? 0} icon={Clock} />
          <Figure label="Overdue" value={s?.overdueCount ?? 0} icon={AlertTriangle} tone="destructive" attention={(s?.overdueCount ?? 0) > 0} />
        </FigureStrip>
      )}

      <ListToolbar tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ status: v })} />} />

      {list.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : list.isError ? (
        <EmptyState
          icon={Receipt}
          title="Could not load commissions"
          actionLabel="Try again"
          onAction={() => void list.refetch()}
        />
      ) : !items.length ? (
        <EmptyState icon={Receipt} title="No commissions" description={EMPTY[tab]} />
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <CommissionRow
              key={c.id}
              c={c}
              paying={payingId === c.id}
              disabled={payingId !== null || payWithCredits.isPending}
              balancePaise={balance}
              onPay={(useCredits) => (useCredits ? setCreditTarget(c) : void pay(c.id))}
            />
          ))}
          <InfiniteScroll
            onLoadMore={() => void list.fetchNextPage()}
            hasMore={!!list.hasNextPage}
            loading={list.isFetchingNextPage}
          />
        </div>
      )}

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
