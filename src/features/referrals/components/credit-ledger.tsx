'use client';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { apiErrorMessage } from '@/lib/api-client';
import { cn, formatDate, formatINR } from '@/lib/utils';
import { CREDIT_REASON_LABEL } from '../referrals.types';
import { useCredits } from '../use-referrals';

/** Paginated credit ledger (earned and spent). */
export function CreditLedger() {
  const list = useCredits();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Credit history</CardTitle>
        <CardDescription>Every credit earned and spent.</CardDescription>
      </CardHeader>
      <CardContent>
        {list.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : list.isError && items.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{apiErrorMessage(list.error, 'Could not load your credits')}</span>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Wallet} title="No credits yet" description="Credits you earn from referrals show up here." />
        ) : (
          <>
            <ul className="divide-y">
              {items.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{CREDIT_REASON_LABEL[c.reason] ?? c.reason}</p>
                    {c.note && <p className="wrap-break-word text-xs text-muted-foreground">{c.note}</p>}
                    <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                  </div>
                  <p className={cn('shrink-0 font-semibold tnum', c.amountPaise >= 0 ? 'text-success' : 'text-foreground')}>
                    {c.amountPaise >= 0 ? '+' : '-'}
                    {formatINR(Math.abs(c.amountPaise))}
                  </p>
                </li>
              ))}
            </ul>
            <InfiniteScroll onLoadMore={() => void list.fetchNextPage()} hasMore={!!list.hasNextPage} loading={list.isFetchingNextPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
