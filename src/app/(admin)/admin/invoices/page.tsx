'use client';
import * as React from 'react';
import { Suspense } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterSelect, ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { SearchInput } from '@/components/common/search-input';
import { AdminList } from '@/features/admin/components/admin-list';
import { useAdminList } from '@/features/admin/use-admin';
import { useUrlState } from '@/features/admin/use-url-state';
import { invoiceErrorMessage } from '@/features/invoices/invoices.errors';
import { fetchAdminInvoices } from '@/features/invoices/invoices.api';
import { INVOICE_TYPES, invoiceTypeLabel, type AdminInvoice } from '@/features/invoices/invoices.types';
import { useDownloadInvoice } from '@/features/invoices/use-invoices';
import { formatDate, formatINR } from '@/lib/utils';

const DEFAULTS = { type: '', q: '' };

function InvoicesView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const type = INVOICE_TYPES.some((t) => t.value === values.type) ? values.type : '';
  const list = useAdminList('invoices', { type, q: values.q }, page, pageSize, fetchAdminInvoices);
  const download = useDownloadInvoice();

  const onDownload = (inv: AdminInvoice) =>
    download.download(inv, { onError: (e) => toast.error(invoiceErrorMessage(e)) });

  const action = (inv: AdminInvoice) => (
    <Button size="sm" variant="outline" onClick={() => onDownload(inv)} disabled={download.isPending} aria-label={`Download ${inv.number}`}>
      {download.pendingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      {download.pendingId === inv.id ? 'Preparing…' : 'Download'}
    </Button>
  );
  const kind = (inv: AdminInvoice) => <Badge variant={inv.isTaxInvoice ? 'success' : 'secondary'}>{inv.isTaxInvoice ? 'Tax invoice' : 'Receipt'}</Badge>;
  const who = (inv: AdminInvoice) => inv.buyerName || inv.buyerGstin || inv.memberId.slice(0, 8) || '-';

  return (
    <div className="space-y-4">
      <PageHeader title="Invoices" />

      <ListToolbar
        search={<SearchInput value={values.q} onChange={(q) => update({ q })} placeholder="Search invoice number or member" />}
        activeFilters={type ? 1 : 0}
        onClearFilters={() => update({ type: '' })}
      >
        <FilterSelect value={type} onChange={(v) => update({ type: v })} options={INVOICE_TYPES} allLabel="All types" ariaLabel="Type" />
      </ListToolbar>

      <AdminList<AdminInvoice>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(i) => i.id}
        empty={{ icon: FileText, title: 'No invoices', description: 'Nothing matches these filters.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="w-32"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.number}</TableCell>
                  <TableCell className="max-w-48 truncate">{who(i)}</TableCell>
                  <TableCell>{invoiceTypeLabel(i.type)}</TableCell>
                  <TableCell>{kind(i)}</TableCell>
                  <TableCell className="text-right tnum">{formatINR(i.totalPaise)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(i.issuedAt)}</TableCell>
                  <TableCell className="text-right">{action(i)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(i) => (
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{i.number}</p>
                {kind(i)}
              </div>
              <p className="text-sm text-muted-foreground">
                {invoiceTypeLabel(i.type)} · {who(i)} · {formatDate(i.issuedAt)}
              </p>
              <p className="text-lg font-semibold tnum">{formatINR(i.totalPaise)}</p>
              {action(i)}
            </CardContent>
          </Card>
        )}
      />
    </div>
  );
}

export default function AdminInvoicesPage() {
  return (
    <Suspense>
      <InvoicesView />
    </Suspense>
  );
}
