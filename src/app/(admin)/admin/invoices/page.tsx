'use client';
import * as React from 'react';
import { Suspense } from 'react';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchInput } from '@/components/common/search-input';
import { AdminList, PageHeader } from '@/features/admin/components/admin-list';
import { useAdminList } from '@/features/admin/use-admin';
import { useUrlState } from '@/features/admin/use-url-state';
import { fetchAdminInvoices } from '@/features/invoices/invoices.api';
import { INVOICE_TYPES, invoiceTypeLabel, type AdminInvoice } from '@/features/invoices/invoices.types';
import { useDownloadInvoice } from '@/features/invoices/use-invoices';
import { apiErrorMessage } from '@/lib/api-client';
import { formatDate, formatINR } from '@/lib/utils';

const DEFAULTS = { type: '', q: '' };

function InvoicesView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const type = INVOICE_TYPES.some((t) => t.value === values.type) ? values.type : '';
  const list = useAdminList('invoices', { type, q: values.q }, page, pageSize, fetchAdminInvoices);
  const download = useDownloadInvoice();

  const onDownload = (id: string) =>
    download.mutate(id, { onError: (e) => toast.error(apiErrorMessage(e, 'Could not download the invoice')) });

  const action = (inv: AdminInvoice) => (
    <Button size="sm" variant="outline" onClick={() => onDownload(inv.id)} disabled={download.isPending} aria-label={`Download ${inv.number}`}>
      <Download className="h-4 w-4" /> Download
    </Button>
  );
  const kind = (inv: AdminInvoice) => <Badge variant={inv.isTaxInvoice ? 'success' : 'secondary'}>{inv.isTaxInvoice ? 'Tax invoice' : 'Receipt'}</Badge>;
  const who = (inv: AdminInvoice) => inv.member?.name || inv.member?.email || '-';

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="GST invoices and receipts issued to members." />

      <div className="flex flex-col gap-3 @lg/content:flex-row">
        <SearchInput className="w-full @lg/content:w-72" value={values.q} onChange={(q) => update({ q })} placeholder="Search invoice number or member" />
        <Select value={type || 'all'} onValueChange={(v) => update({ type: v === 'all' ? '' : v })}>
          <SelectTrigger className="w-full @lg/content:w-52" aria-label="Type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {INVOICE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                <TableHead />
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
                  <TableCell>{action(i)}</TableCell>
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
