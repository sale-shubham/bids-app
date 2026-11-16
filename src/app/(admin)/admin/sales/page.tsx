'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Banknote, RotateCcw, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FilterSelect, ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu';
import { SearchInput } from '@/components/common/search-input';
import { AdminList, StatusTabs } from '@/features/admin/components/admin-list';
import { useAdminSales, useRefundSale, useReleaseSale } from '@/features/admin/use-admin';
import { useUrlState } from '@/features/admin/use-url-state';
import { saleErrorMessage } from '@/features/sales/sales.errors';
import { SaleStatusBadge } from '@/features/sales/components/sale-status-badge';
import type { SaleDTO } from '@/features/sales/sales.types';
import { SALE_STATUS_LABEL, SALE_TABS, saleActions } from '@/features/sales/sales.utils';
import { formatDate, formatINR } from '@/lib/utils';

const DEFAULTS = { status: 'all', q: '' };
// Statuses with no tab of their own: offered in the Filters panel (same `status` URL param).
const EXTRA_STATUSES = (['DELIVERED', 'REFUNDED', 'CANCELLED'] as const).map((v) => ({ value: v, label: SALE_STATUS_LABEL[v] }));

function SalesView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const isTab = SALE_TABS.some((t) => t.value === values.status);
  const isExtra = EXTRA_STATUSES.some((t) => t.value === values.status);
  const status = isTab || isExtra ? values.status : 'all';
  const extra = isExtra ? status : '';
  const list = useAdminSales({ status, q: values.q }, page, pageSize);
  const release = useReleaseSale();
  const refund = useRefundSale();
  const [target, setTarget] = React.useState<{ sale: SaleDTO; mode: 'release' | 'refund' } | null>(null);
  const [note, setNote] = React.useState('');

  const close = () => {
    setTarget(null);
    setNote('');
  };
  const onRelease = () =>
    target &&
    release.mutate(target.sale.id, {
      onSuccess: () => {
        toast.success('Payment released to the seller');
        close();
      },
      onError: (e) => toast.error(saleErrorMessage(e, 'Could not release the payment')),
    });
  const onRefund = () =>
    target &&
    refund.mutate(
      { id: target.sale.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Payment refunded to the buyer');
          close();
        },
        onError: (e) => toast.error(saleErrorMessage(e, 'Could not refund the payment')),
      },
    );

  const actions = (s: SaleDTO) => {
    const a = saleActions({ ...s, role: 'ADMIN' });
    const items: RowAction[] = [];
    if (a.canRelease) items.push({ label: 'Release', icon: Banknote, onSelect: () => setTarget({ sale: s, mode: 'release' }) });
    if (a.canRefund) items.push({ label: 'Refund', icon: RotateCcw, destructive: true, separated: true, onSelect: () => setTarget({ sale: s, mode: 'refund' }) });
    return <RowActionsMenu name={s.auction.title} actions={items} />;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Sales" />

      <ListToolbar
        tabs={<StatusTabs value={extra ? '' : status} tabs={SALE_TABS} onChange={(v) => update({ status: v })} />}
        search={<SearchInput value={values.q} onChange={(q) => update({ q })} placeholder="Search auction, buyer or seller" />}
        activeFilters={extra ? 1 : 0}
        onClearFilters={() => update({ status: '' })}
      >
        <FilterSelect value={extra} onChange={(v) => update({ status: v })} options={EXTRA_STATUSES} allLabel="Other statuses" ariaLabel="Other status" />
      </ListToolbar>

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
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
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
                  <TableCell className="text-right">{actions(s)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(s) => (
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/auctions/${s.auction.id}`} className="min-w-0 font-medium wrap-break-word hover:underline">
                  {s.auction.title}
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <SaleStatusBadge status={s.status} />
                  {actions(s)}
                </div>
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
            </CardContent>
          </Card>
        )}
      />

      <ConfirmDialog
        open={target?.mode === 'release'}
        onOpenChange={(o) => !o && close()}
        title="Release this payment?"
        description={
          target
            ? `${formatINR(target.sale.payoutPaise ?? target.sale.amountPaise)} will be paid out to ${target.sale.seller.name} for "${target.sale.auction.title}". This cannot be undone.`
            : undefined
        }
        confirmLabel="Release payment"
        loading={release.isPending}
        onConfirm={onRelease}
      />
      <ConfirmDialog
        open={target?.mode === 'refund'}
        onOpenChange={(o) => !o && close()}
        title="Refund this payment?"
        description={
          target
            ? `${formatINR(target.sale.amountPaise)} will be returned to ${target.sale.buyer.name} for "${target.sale.auction.title}". This cannot be undone.`
            : undefined
        }
        confirmLabel="Refund buyer"
        variant="destructive"
        loading={refund.isPending}
        onConfirm={onRefund}
      >
        <div className="space-y-1.5">
          <Label htmlFor="refund-note">Note (optional)</Label>
          <Textarea id="refund-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this being refunded?" />
        </div>
      </ConfirmDialog>
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
