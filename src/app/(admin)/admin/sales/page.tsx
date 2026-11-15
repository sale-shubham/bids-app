'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchInput } from '@/components/common/search-input';
import { AdminList, PageHeader, StatusTabs } from '@/features/admin/components/admin-list';
import { useAdminSales } from '@/features/admin/use-admin';
import { useUrlState } from '@/features/admin/use-url-state';
import { AdminSaleActions } from '@/features/sales/components/admin-sale-actions';
import { SaleStatusBadge } from '@/features/sales/components/sale-status-badge';
import type { SaleDTO } from '@/features/sales/sales.types';
import { SALE_TABS } from '@/features/sales/sales.utils';
import { formatDate, formatINR } from '@/lib/utils';

const DEFAULTS = { status: 'all', q: '' };

function SalesView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const status = SALE_TABS.some((t) => t.value === values.status) ? values.status : 'all';
  const list = useAdminSales({ status, q: values.q }, page, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description="Winner payments, shipping and payouts. Release or refund a sale when it needs a decision." />
      <div className="flex flex-col gap-3 @lg/content:flex-row @lg/content:items-center">
        <SearchInput className="w-full @lg/content:w-72" value={values.q} onChange={(q) => update({ q })} placeholder="Search auction, buyer or seller" />
      </div>
      <StatusTabs value={status} tabs={SALE_TABS} onChange={(v) => update({ status: v })} />

      <AdminList<SaleDTO>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(s) => s.id}
        empty={{ icon: ShoppingBag, title: 'No sales', description: 'Nothing matches this filter.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auction</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="max-w-56">
                    <Link href={`/auctions/${s.auction.id}`} className="line-clamp-2 font-medium hover:underline">
                      {s.auction.title}
                    </Link>
                  </TableCell>
                  <TableCell>{s.buyer.name}</TableCell>
                  <TableCell>{s.seller.name}</TableCell>
                  <TableCell className="text-right tnum">{formatINR(s.amountPaise)}</TableCell>
                  <TableCell>
                    <SaleStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{s.paidAt ? formatDate(s.paidAt) : '-'}</TableCell>
                  <TableCell>
                    <AdminSaleActions sale={s} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(s) => (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/auctions/${s.auction.id}`} className="min-w-0 font-medium wrap-break-word hover:underline">
                  {s.auction.title}
                </Link>
                <SaleStatusBadge status={s.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {s.buyer.name} → {s.seller.name}
              </p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Amount</dt>
                  <dd className="tnum">{formatINR(s.amountPaise)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Paid on</dt>
                  <dd>{s.paidAt ? formatDate(s.paidAt) : '-'}</dd>
                </div>
              </dl>
              <AdminSaleActions sale={s} />
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}

export default function AdminSalesPage() {
  return (
    <Suspense>
      <SalesView />
    </Suspense>
  );
}
