'use client';
import * as React from 'react';
import Link from 'next/link';
import { Loader2, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { StatusBadge } from '@/components/common/status-badge';
import { CoverImage } from '@/features/auctions/components/auction-card';
import { useCommissions, useCommissionSummary } from '@/features/commissions/use-commissions';
import { useStubPaymentConfirm } from '@/features/payments/use-stub-payment-confirm';
import { usePayCommission } from '@/features/commissions/use-pay-commission';
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
  onPay,
}: {
  c: CommissionDTO;
  paying: boolean;
  disabled: boolean;
  onPay: () => void;
}) {
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
          {c.status === 'DUE' && (
            <Button size="sm" onClick={onPay} disabled={disabled}>
              {paying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Pay {formatINR(c.amountPaise)}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SellCommissionsPage() {
  const [tab, setTab] = React.useState<CommissionTab>('due');
  const list = useCommissions(tab);
  const summary = useCommissionSummary();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  const { confirmStub, stubDialog } = useStubPaymentConfirm();
  const { pay, payingId } = usePayCommission(confirmStub);

  const s = summary.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
        <p className="text-muted-foreground">
          A 5% commission is due when your auction sells. Pay it to keep creating auctions.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 @lg/content:grid-cols-3">
          {summary.isLoading ? (
            <Skeleton className="h-14 @lg/content:col-span-3" />
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Total unpaid</p>
                <p className="text-2xl font-bold">{formatINR(s?.unpaidPaise ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commissions due</p>
                <p className="text-2xl font-bold">{s?.dueCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="flex items-center gap-2 text-2xl font-bold">
                  {s?.overdueCount ?? 0}
                  {(s?.overdueCount ?? 0) > 0 && <Badge variant="destructive">Overdue</Badge>}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CommissionTab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
              disabled={payingId !== null}
              onPay={() => void pay(c.id)}
            />
          ))}
          <InfiniteScroll
            onLoadMore={() => void list.fetchNextPage()}
            hasMore={!!list.hasNextPage}
            loading={list.isFetchingNextPage}
          />
        </div>
      )}

      {stubDialog}
    </div>
  );
}
