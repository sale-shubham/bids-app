'use client';
import * as React from 'react';
import Link from 'next/link';
import { CreditCard, Eye, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListToolbar } from '@/components/common/list-toolbar';
import { PagedList } from '@/components/common/paged-list';
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu';
import { StatusTabs } from '@/components/common/status-tabs';
import { useUrlState } from '@/features/admin/use-url-state';
import { CoverImage } from '@/features/auctions/components/auction-card';
import { formatDate, formatINR } from '@/lib/utils';
import type { SaleDTO, SaleListRole, SaleStatus } from '../sales.types';
import { SALE_TABS } from '../sales.utils';
import { useMySales } from '../use-sales';
import { SaleStatusBadge } from './sale-status-badge';

const hrefFor = (sale: SaleDTO, role: SaleListRole) => (role === 'buyer' ? `/purchases/${sale.id}` : `/sell/sales/${sale.id}`);

/** The one main money action for a row (buyer pays, seller ships), shown inline beside the menu. */
function NextStep({ sale, role }: { sale: SaleDTO; role: SaleListRole }) {
  const href = hrefFor(sale, role);
  if (role === 'buyer' && sale.status === 'AWAITING_PAYMENT')
    return (
      <Button asChild size="sm">
        <Link href={href}>Pay now</Link>
      </Button>
    );
  if (role === 'seller' && sale.status === 'PAID')
    return (
      <Button asChild size="sm" variant="outline">
        <Link href={href}>Ship</Link>
      </Button>
    );
  return null;
}

function rowActions(sale: SaleDTO, role: SaleListRole) {
  const href = hrefFor(sale, role);
  const menu: RowAction[] = [];
  if (role === 'buyer' && sale.status === 'AWAITING_PAYMENT') menu.push({ label: 'Pay now', icon: CreditCard, href });
  if (role === 'seller' && sale.status === 'PAID') menu.push({ label: 'Ship', icon: Truck, href });
  menu.push({ label: 'View', icon: Eye, href });
  return (
    <div className="flex items-center justify-end gap-2">
      <NextStep sale={sale} role={role} />
      <RowActionsMenu name={sale.auction.title} actions={menu} />
    </div>
  );
}

const counterparty = (sale: SaleDTO, role: SaleListRole) => (role === 'buyer' ? sale.seller.name : sale.buyer.name);
/** Awaiting-payment buyers see the deadline, everyone else the day the sale was made. */
const dateLabel = (sale: SaleDTO, role: SaleListRole) =>
  role === 'buyer' && sale.status === 'AWAITING_PAYMENT' && sale.payBy ? `Pay by ${formatDate(sale.payBy)}` : formatDate(sale.createdAt);

/** The table / cards, loading / error / empty states and pagination for one status (`all` = every status). Page and page size come from the URL. */
export function SaleListBody({ role, status }: { role: SaleListRole; status: SaleStatus | 'all' }) {
  const { page, pageSize, update } = useUrlState({});
  const list = useMySales(role, status, page, pageSize);
  const noun = role === 'buyer' ? 'purchases' : 'sales';
  const who = role === 'buyer' ? 'Seller' : 'Buyer';

  return (
    <PagedList<SaleDTO>
      list={list}
      page={page}
      onPageChange={(p) => update({ page: String(p) })}
      onPageSizeChange={(s) => update({ pageSize: String(s) })}
      getKey={(s) => s.id}
      errorTitle={`Could not load your ${noun}`}
      empty={{
        icon: ShoppingBag,
        title: `No ${noun}`,
        description: role === 'buyer' ? 'Auctions you win are listed here, ready to pay for.' : 'When one of your auctions sells, the sale appears here.',
      }}
      renderTable={(items) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>{who}</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-px">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="max-w-72">
                  <Link href={hrefFor(s, role)} className="flex items-center gap-3 hover:underline">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      <CoverImage src={s.auction.coverImage} alt={s.auction.title} sizes="48px" />
                    </div>
                    <span className="line-clamp-2 font-medium">{s.auction.title}</span>
                  </Link>
                </TableCell>
                <TableCell className="max-w-48 truncate">{counterparty(s, role)}</TableCell>
                <TableCell className="text-right tnum">{formatINR(s.amountPaise)}</TableCell>
                <TableCell>
                  <SaleStatusBadge status={s.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{dateLabel(s, role)}</TableCell>
                <TableCell className="text-right">{rowActions(s, role)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      renderCard={(s) => (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-3">
              <Link href={hrefFor(s, role)} className="flex min-w-0 grow items-center gap-3 hover:underline">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <CoverImage src={s.auction.coverImage} alt={s.auction.title} sizes="56px" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium wrap-break-word">{s.auction.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {who}: {counterparty(s, role)}
                  </p>
                </div>
              </Link>
              {rowActions(s, role)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SaleStatusBadge status={s.status} />
              <span className="text-sm text-muted-foreground">{dateLabel(s, role)}</span>
            </div>
            <p className="text-sm font-semibold tnum">{formatINR(s.amountPaise)}</p>
          </CardContent>
        </Card>
      )}
    />
  );
}

const DEFAULTS = { status: 'all' };

/**
 * Status-tabbed list of the caller's purchases (`buyer`) or sales (`seller`).
 * The tab lives in the URL (`?status=`), validated against `SALE_TABS`; needs a `<Suspense>` above it.
 * Pages that own their toolbar (`/purchases`) render `SaleListBody` directly.
 */
export function SaleList({ role }: { role: SaleListRole }) {
  const { values, update } = useUrlState(DEFAULTS);
  const tab = (SALE_TABS.find((t) => t.value === values.status)?.value ?? 'all') as SaleStatus | 'all';

  return (
    <div className="space-y-4">
      <ListToolbar tabs={<StatusTabs value={tab} tabs={SALE_TABS} onChange={(v) => update({ status: v })} />} />
      <SaleListBody role={role} status={tab} />
    </div>
  );
}
