'use client';
import * as React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { CoverImage } from '@/features/auctions/components/auction-card';
import { formatDate, formatINR } from '@/lib/utils';
import type { SaleDTO, SaleListRole, SaleStatus } from '../sales.types';
import { SALE_TABS } from '../sales.utils';
import { useMySales } from '../use-sales';
import { SaleStatusBadge } from './sale-status-badge';

function SaleRow({ sale, role }: { sale: SaleDTO; role: SaleListRole }) {
  const href = role === 'buyer' ? `/purchases/${sale.id}` : `/sell/sales/${sale.id}`;
  const needsPayment = role === 'buyer' && sale.status === 'AWAITING_PAYMENT';
  const needsShipping = role === 'seller' && sale.status === 'PAID';
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 @lg/content:flex-row @lg/content:items-center">
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            <CoverImage src={sale.auction.coverImage} alt={sale.auction.title} sizes="64px" />
          </div>
          <div className="min-w-0">
            <p className="wrap-break-word font-medium">{sale.auction.title}</p>
            <p className="text-xs text-muted-foreground">{role === 'buyer' ? `Seller: ${sale.seller.name}` : `Buyer: ${sale.buyer.name}`}</p>
          </div>
        </Link>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm @lg/content:flex @lg/content:items-center">
          <div>
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="font-semibold tnum">{formatINR(sale.amountPaise)}</dd>
          </div>
          {needsPayment && sale.payBy && (
            <div>
              <dt className="text-xs text-muted-foreground">Pay by</dt>
              <dd>{formatDate(sale.payBy)}</dd>
            </div>
          )}
        </dl>
        <div className="flex flex-wrap items-center gap-2 @lg/content:justify-end">
          <SaleStatusBadge status={sale.status} />
          <Button asChild size="sm" variant={needsPayment || needsShipping ? 'default' : 'outline'}>
            <Link href={href}>{needsPayment ? 'Pay now' : needsShipping ? 'Ship' : 'View'}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Status-tabbed, infinite-scroll list of the caller's purchases (`buyer`) or sales (`seller`). */
export function SaleList({ role }: { role: SaleListRole }) {
  const [tab, setTab] = React.useState<SaleStatus | 'all'>('all');
  const list = useMySales(role, tab);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const noun = role === 'buyer' ? 'purchases' : 'sales';

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <Tabs value={tab} onValueChange={(v) => setTab(v as SaleStatus | 'all')}>
          <TabsList>
            {SALE_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {list.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : list.isError ? (
        <EmptyState icon={ShoppingBag} title={`Could not load your ${noun}`} actionLabel="Try again" onAction={() => void list.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={ShoppingBag}
          title={`No ${noun}`}
          description={
            role === 'buyer'
              ? 'Auctions you win are listed here, ready to pay for.'
              : 'When one of your auctions sells, the sale appears here.'
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <SaleRow key={s.id} sale={s} role={role} />
          ))}
          <InfiniteScroll onLoadMore={() => void list.fetchNextPage()} hasMore={!!list.hasNextPage} loading={list.isFetchingNextPage} />
        </div>
      )}
    </div>
  );
}
