'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { SearchInput } from '@/components/common/search-input';
import { AdminList, PageHeader, StatusTabs } from '@/features/admin/components/admin-list';
import { useAdminAuctions, useCancelAdminAuction } from '@/features/admin/use-admin';
import { useUrlState } from '@/features/admin/use-url-state';
import type { AdminAuction } from '@/features/admin/admin.types';
import { SetDepositDialog } from '@/features/deposits/components/set-deposit-dialog';
import { AuctionStatusBadge, CoverImage } from '@/features/auctions/components/auction-card';
import { apiErrorMessage } from '@/lib/api-client';
import { formatDate, formatINR } from '@/lib/utils';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
];
const DEFAULTS = { status: 'all', q: '' };

const price = (a: AdminAuction) => formatINR(a.bidCount > 0 ? a.currentBidPaise : a.startingBidPaise);
const whenLabel = (a: AdminAuction) =>
  `${a.status === 'ENDED' ? 'Ended' : a.status === 'SCHEDULED' ? 'Starts' : a.status === 'CANCELLED' ? 'Was due' : 'Ends'} ${formatDate(
    a.status === 'SCHEDULED' ? a.startTime : a.endTime,
  )}`;
const canCancel = (a: AdminAuction) => a.status === 'LIVE' || a.status === 'SCHEDULED';

function AuctionsView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const status = TABS.some((t) => t.value === values.status) ? values.status : 'all';
  const list = useAdminAuctions({ status, q: values.q }, page, pageSize);
  const cancel = useCancelAdminAuction();
  const [target, setTarget] = React.useState<AdminAuction | null>(null);
  const [depositTarget, setDepositTarget] = React.useState<AdminAuction | null>(null);

  const confirm = () => {
    if (!target) return;
    cancel.mutate(target.id, {
      onSuccess: () => {
        toast.success('Auction cancelled');
        setTarget(null);
      },
      onError: (e) => toast.error(apiErrorMessage(e, 'Could not cancel the auction')),
    });
  };

  const depositBtn = (a: AdminAuction) =>
    a.status === 'LIVE' || a.status === 'SCHEDULED' ? (
      <Button size="sm" variant="outline" onClick={() => setDepositTarget(a)}>
        Set deposit
      </Button>
    ) : null;

  const actionButtons = (a: AdminAuction) => (
    <div className="flex flex-wrap items-center gap-2">
      {depositBtn(a)}
      {canCancel(a) && (
        <Button size="sm" variant="outline" className="text-destructive" onClick={() => setTarget(a)}>
          Cancel
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Auctions" description="Review every auction and cancel those that break the rules." />

      <div className="flex flex-col gap-3 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
        <StatusTabs value={status} tabs={TABS} onChange={(v) => update({ status: v })} />
        <SearchInput className="w-full @lg/content:w-72" value={values.q} onChange={(q) => update({ q })} placeholder="Search title" />
      </div>

      <AdminList<AdminAuction>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(a) => a.id}
        empty={{ icon: Gavel, title: 'No auctions found', description: 'Try a different tab or search.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16" />
                <TableHead>Title</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Current bid</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
                <TableHead className="text-right">Bids</TableHead>
                <TableHead>Ends / ended</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                      <CoverImage src={a.coverImage} alt={a.title} sizes="48px" />
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <Link href={`/auctions/${a.id}`} className="line-clamp-2 font-medium hover:underline">
                      {a.title}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{a.sellerEmail || a.seller.name}</TableCell>
                  <TableCell>
                    <AuctionStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-right tnum">{price(a)}</TableCell>
                  <TableCell className="text-right tnum">{a.depositPaise ? formatINR(a.depositPaise) : '-'}</TableCell>
                  <TableCell className="text-right tnum">{a.bidCount}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(a.endTime)}</TableCell>
                  <TableCell>{actionButtons(a)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(a) => (
          <Card>
            <CardContent className="space-y-3 p-4">
              <Link href={`/auctions/${a.id}`} className="flex items-center gap-3 hover:underline">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <CoverImage src={a.coverImage} alt={a.title} sizes="56px" />
                </div>
                <span className="min-w-0 font-medium wrap-break-word">{a.title}</span>
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <AuctionStatusBadge status={a.status} />
                <span className="text-muted-foreground">{whenLabel(a)}</span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{a.sellerEmail || a.seller.name}</p>
              <p className="text-sm tnum">
                {price(a)} · {a.bidCount} {a.bidCount === 1 ? 'bid' : 'bids'}
              </p>
              {typeof a.depositPaise === 'number' && a.depositPaise > 0 && <p className="text-sm text-muted-foreground">Deposit {formatINR(a.depositPaise)}</p>}
              {actionButtons(a)}
            </CardContent>
          </Card>
        )}
      />

      <SetDepositDialog auction={depositTarget} onClose={() => setDepositTarget(null)} />

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Cancel this auction?"
        description={target ? `"${target.title}" will be cancelled and removed from public listings.` : undefined}
        confirmLabel="Cancel auction"
        variant="destructive"
        loading={cancel.isPending}
        onConfirm={confirm}
      >
        {target && target.bidCount > 0 && (
          <p className="rounded-md bg-warning/10 p-3 text-sm text-warning">
            Warning: this auction already has {target.bidCount} {target.bidCount === 1 ? 'bid' : 'bids'}. Cancelling it discards them and bidders will be notified.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

export default function AdminAuctionsPage() {
  return (
    <Suspense>
      <AuctionsView />
    </Suspense>
  );
}
