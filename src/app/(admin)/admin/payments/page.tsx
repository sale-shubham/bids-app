'use client';
import { Suspense } from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/common/status-badge';
import { AdminList, PageHeader, StatusTabs } from '@/features/admin/components/admin-list';
import { CopyableId } from '@/features/admin/components/copy-button';
import { useAdminPayments } from '@/features/admin/use-admin';
import { useUrlState } from '@/features/admin/use-url-state';
import type { AdminPayment } from '@/features/admin/admin.types';
import { formatDate, formatINR } from '@/lib/utils';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'created', label: 'Created' },
  { value: 'failed', label: 'Failed' },
];
const DEFAULTS = { status: 'all' };

const reference = (p: AdminPayment) =>
  p.referenceType ? `${p.referenceType.toLowerCase()}${p.referenceId ? ` · ${p.referenceId.slice(0, 8)}` : ''}` : '-';

function PaymentsView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const status = TABS.some((t) => t.value === values.status) ? values.status : 'all';
  const list = useAdminPayments({ status }, page, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Gateway payments, including commission settlements." />
      <StatusTabs value={status} tabs={TABS} onChange={(v) => update({ status: v })} />

      <AdminList<AdminPayment>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(p) => p.id}
        empty={{ icon: CreditCard, title: 'No payments', description: 'Nothing matches this tab.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order id</TableHead>
                <TableHead>Payment id</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.member.name}</div>
                    <div className="max-w-48 truncate text-xs text-muted-foreground">{p.member.email}</div>
                  </TableCell>
                  <TableCell className="text-right tnum">{formatINR(p.amountPaise)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status.toUpperCase()} />
                  </TableCell>
                  <TableCell className="max-w-44">
                    <CopyableId value={p.gatewayOrderId} label="Order id" />
                  </TableCell>
                  <TableCell className="max-w-44">
                    <CopyableId value={p.gatewayPaymentId} label="Payment id" />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{reference(p)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(p.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(p) => (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{p.member.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{p.member.email}</p>
                </div>
                <StatusBadge status={p.status.toUpperCase()} />
              </div>
              <p className="text-lg font-semibold tnum">{formatINR(p.amountPaise)}</p>
              <dl className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <dt className="w-16 shrink-0 text-xs text-muted-foreground">Order</dt>
                  <dd className="min-w-0"><CopyableId value={p.gatewayOrderId} label="Order id" /></dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-16 shrink-0 text-xs text-muted-foreground">Payment</dt>
                  <dd className="min-w-0"><CopyableId value={p.gatewayPaymentId} label="Payment id" /></dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-16 shrink-0 text-xs text-muted-foreground">For</dt>
                  <dd>{reference(p)}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense>
      <PaymentsView />
    </Suspense>
  );
}
