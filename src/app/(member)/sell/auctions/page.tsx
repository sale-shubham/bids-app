'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Eye, Gavel, Pencil, Plus, RotateCw, Store, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Countdown } from '@/components/common/countdown';
import { ListToolbar } from '@/components/common/list-toolbar';
import { PagedList } from '@/components/common/paged-list';
import { PageHeader } from '@/components/common/page-header';
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusTabs } from '@/components/common/status-tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUrlState } from '@/features/admin/use-url-state';
import { AuctionStatusBadge, CoverImage } from '@/features/auctions/components/auction-card';
import { RepublishDialog } from '@/features/auctions/components/republish-dialog';
import { auctionErrorMessage } from '@/features/auctions/auctions.errors';
import type { AuctionCard, MineStatus } from '@/features/auctions/auctions.types';
import { useDeleteAuction, useMyAuctions } from '@/features/auctions/use-auctions';
import { formatINR } from '@/lib/utils';

const TABS: { value: MineStatus; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
];
// The first tab is the default: it is what `/sell/auctions` shows and it keeps the URL clean.
const DEFAULTS = { status: TABS[0].value as string };

function SellAuctionsView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const tab = (TABS.find((t) => t.value === values.status)?.value ?? TABS[0].value) as MineStatus;
  const list = useMyAuctions(tab, page, pageSize);
  const canCreate = tab === 'live' || tab === 'upcoming';
  const del = useDeleteAuction();
  const [toDelete, setToDelete] = React.useState<AuctionCard | null>(null);
  const [republishId, setRepublishId] = React.useState<string | null>(null);

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Auction deleted');
        setToDelete(null);
      },
      onError: (e) => {
        toast.error(auctionErrorMessage(e, 'Could not delete the auction'));
        setToDelete(null);
      },
    });
  };

  const actions = (a: AuctionCard) => {
    const editable = a.bidCount === 0 && (a.status === 'SCHEDULED' || a.status === 'LIVE');
    const republishable = a.status === 'ENDED' && a.bidCount === 0;
    const menu: RowAction[] = [
      { label: 'Bids', icon: Gavel, href: `/sell/auctions/${a.id}` },
      { label: 'View', icon: Eye, href: `/auctions/${a.id}` },
    ];
    if (editable) menu.push({ label: 'Edit', icon: Pencil, href: `/sell/auctions/${a.id}/edit` });
    if (republishable) menu.push({ label: 'Republish', icon: RotateCw, onSelect: () => setRepublishId(a.id) });
    if (editable) menu.push({ label: 'Delete', icon: Trash2, destructive: true, separated: true, onSelect: () => setToDelete(a) });
    return <RowActionsMenu name={a.title} actions={menu} />;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="My auctions"
        action={
          <Button asChild>
            <Link href="/sell/new">
              <Plus className="h-4 w-4" /> New auction
            </Link>
          </Button>
        }
      />

      <ListToolbar tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ status: v })} />} />

      <PagedList<AuctionCard>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(a) => a.id}
        errorTitle="Could not load your auctions"
        empty={{
          icon: Store,
          title: `No ${tab} auctions`,
          description: canCreate ? 'Create an auction to get started.' : 'Nothing to show here yet.',
          ...(canCreate ? { actionLabel: 'Create auction', actionHref: '/sell/new' } : {}),
        }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Bids</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-72">
                    <Link href={`/sell/auctions/${a.id}`} className="flex items-center gap-3 hover:underline">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        <CoverImage src={a.coverImage} alt={a.title} sizes="48px" />
                      </div>
                      <span className="line-clamp-2 font-medium">{a.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <AuctionStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.category}</TableCell>
                  <TableCell className="text-right tnum">{formatINR(a.bidCount > 0 ? a.currentBidPaise : a.startingBidPaise)}</TableCell>
                  <TableCell className="text-right tnum">{a.bidCount}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Countdown startTime={a.startTime} endTime={a.endTime} status={a.status} />
                  </TableCell>
                  <TableCell className="text-right">{actions(a)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(a) => (
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-3">
                <Link href={`/sell/auctions/${a.id}`} className="flex min-w-0 grow items-center gap-3 hover:underline">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    <CoverImage src={a.coverImage} alt={a.title} sizes="56px" />
                  </div>
                  <span className="min-w-0 font-medium wrap-break-word">{a.title}</span>
                </Link>
                {actions(a)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AuctionStatusBadge status={a.status} />
                <span className="text-xs text-muted-foreground">{a.category}</span>
              </div>
              <p className="text-sm text-muted-foreground tnum">
                {a.bidCount > 0 ? `Current ${formatINR(a.currentBidPaise)}` : `Starts at ${formatINR(a.startingBidPaise)}`} · {a.bidCount} {a.bidCount === 1 ? 'bid' : 'bids'}
              </p>
              <Countdown startTime={a.startTime} endTime={a.endTime} status={a.status} />
            </CardContent>
          </Card>
        )}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this auction?"
        description={toDelete ? `"${toDelete.title}" will be removed. This cannot be undone.` : undefined}
        confirmLabel="Delete"
        variant="destructive"
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
      <RepublishDialog auctionId={republishId} open={!!republishId} onOpenChange={(o) => !o && setRepublishId(null)} />
    </div>
  );
}

export default function SellAuctionsPage() {
  return (
    <Suspense>
      <SellAuctionsView />
    </Suspense>
  );
}
