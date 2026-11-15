'use client';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { apiErrorMessage } from '@/lib/api-client';
import { formatDate, formatINR } from '@/lib/utils';
import { invoiceTypeLabel } from '../invoices.types';
import { useDownloadInvoice, useMyInvoices } from '../use-invoices';

/** Profile > Invoices: the member's GST invoices and receipts with PDF download. */
export function InvoicesCard() {
  const list = useMyInvoices();
  const download = useDownloadInvoice();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  const onDownload = (id: string) =>
    download.mutate(id, { onError: (e) => toast.error(apiErrorMessage(e, 'Could not download the invoice')) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>GST tax invoices and receipts for fees you paid NobleBid.</CardDescription>
      </CardHeader>
      <CardContent>
        {list.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : list.isError && items.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{apiErrorMessage(list.error, 'Could not load your invoices')}</span>
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={FileText} title="No invoices yet" description="Invoices appear here after you pay a commission or a promotion." />
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((inv) => (
                <li key={inv.id} className="flex flex-col gap-3 rounded-lg border p-3 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{inv.number}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{invoiceTypeLabel(inv.type)}</span>
                      <span>{formatDate(inv.issuedAt)}</span>
                      <Badge variant={inv.isTaxInvoice ? 'success' : 'secondary'}>{inv.isTaxInvoice ? 'Tax invoice' : 'Receipt'}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tnum">{formatINR(inv.totalPaise)}</span>
                    <Button variant="outline" size="sm" onClick={() => onDownload(inv.id)} disabled={download.isPending} aria-label={`Download ${inv.number}`}>
                      {download.isPending && download.variables === inv.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                      Download
                    </Button>
                  </div>
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
