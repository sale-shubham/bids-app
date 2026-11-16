'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { StatusBadge } from '@/components/common/status-badge';
import { AdminList, PageHeader, StatusTabs } from '@/features/admin/components/admin-list';
import { useAdminCommissions, useWaiveCommission } from '@/features/admin/use-admin';
import { useUrlState } from '@/features/admin/use-url-state';
import type { AdminCommission } from '@/features/admin/admin.types';
import { commissionErrorMessage } from '@/features/commissions/commissions.errors';
import { formatDate, formatINR } from '@/lib/utils';

const TABS = [
  { value: 'due', label: 'Due' },
  { value: 'paid', label: 'Paid' },
  { value: 'waived', label: 'Waived' },
  { value: 'all', label: 'All' },
];
const DEFAULTS = { status: 'due' };

const WAIVE_NOTE_MIN = 3;
const WAIVE_NOTE_MAX = 200;

const rate = (bps: number) => `${(bps / 100).toFixed(2)}%`;

function DueCell({ c }: { c: AdminCommission }) {
  if (!c.dueAt) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {formatDate(c.dueAt)}
      {c.status === 'DUE' && c.isOverdue && <Badge variant="destructive">Overdue</Badge>}
    </span>
  );
}

function WaivedNote({ c }: { c: AdminCommission }) {
  if (c.status !== 'WAIVED' || !c.waivedNote) return null;
  return <p className="mt-1 max-w-56 text-xs text-muted-foreground wrap-break-word">Waived: {c.waivedNote}</p>;
}

function CommissionsView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const status = TABS.some((t) => t.value === values.status) ? values.status : 'due';
  const list = useAdminCommissions({ status }, page, pageSize);
  const waive = useWaiveCommission();
  const [target, setTarget] = React.useState<AdminCommission | null>(null);
  const [reason, setReason] = React.useState('');

  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < WAIVE_NOTE_MIN;

  const close = () => {
    setTarget(null);
    setReason('');
  };

  const confirm = () => {
    if (!target) return;
    const note = reason.trim();
    if (note && note.length < WAIVE_NOTE_MIN) return;
    waive.mutate(note ? { id: target.id, note } : { id: target.id }, {
      onSuccess: () => {
        toast.success('Commission waived');
        close();
      },
      onError: (e) => toast.error(commissionErrorMessage(e, 'Could not waive the commission')),
    });
  };

  const waiveBtn = (c: AdminCommission) =>
    c.status === 'DUE' ? (
      <Button size="sm" variant="outline" onClick={() => setTarget(c)}>
        Waive
      </Button>
    ) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Commissions" description="Commission owed by auctioneers on sold auctions." />
      <StatusTabs value={status} tabs={TABS} onChange={(v) => update({ status: v })} />

      <AdminList<AdminCommission>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(c) => c.id}
        empty={{ icon: Receipt, title: 'No commissions', description: 'Nothing matches this tab.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auction</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-56">
                    <Link href={`/auctions/${c.auction.id}`} className="line-clamp-2 font-medium hover:underline">
                      {c.auction.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{c.seller.name}</div>
                    <div className="max-w-48 truncate text-xs text-muted-foreground">{c.seller.email}</div>
                  </TableCell>
                  <TableCell className="text-right tnum">{formatINR(c.amountPaise)}</TableCell>
                  <TableCell className="text-right tnum">{rate(c.rateBps)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DueCell c={c} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                    <WaivedNote c={c} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{c.paidAt ? formatDate(c.paidAt) : '-'}</TableCell>
                  <TableCell>{waiveBtn(c)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(c) => (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/auctions/${c.auction.id}`} className="min-w-0 font-medium wrap-break-word hover:underline">
                  {c.auction.title}
                </Link>
                <StatusBadge status={c.status} />
              </div>
              <WaivedNote c={c} />
              <p className="truncate text-sm text-muted-foreground">
                {c.seller.name} · {c.seller.email}
              </p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Amount ({rate(c.rateBps)})</dt>
                  <dd className="tnum">{formatINR(c.amountPaise)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{c.paidAt ? 'Paid on' : 'Due date'}</dt>
                  <dd>{c.paidAt ? formatDate(c.paidAt) : <DueCell c={c} />}</dd>
                </div>
              </dl>
              {waiveBtn(c)}
            </CardContent>
          </Card>
        )}
      />

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && close()}
        title="Waive this commission?"
        description={target ? `${target.seller.name} will no longer owe ${formatINR(target.amountPaise)} for "${target.auction.title}". This cannot be undone.` : undefined}
        confirmLabel="Waive commission"
        variant="destructive"
        loading={waive.isPending}
        onConfirm={confirm}
      >
        <div className="space-y-2">
          <Label htmlFor="waive-reason">Reason (saved with the commission)</Label>
          <Input
            id="waive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={WAIVE_NOTE_MAX}
            placeholder="e.g. goodwill after a dispute"
            aria-invalid={reasonTooShort}
          />
          {reasonTooShort ? (
            <p className="text-xs text-destructive">Use at least {WAIVE_NOTE_MIN} characters, or leave it empty.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Optional. Saved for admins only; the seller does not see it.</p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default function AdminCommissionsPage() {
  return (
    <Suspense>
      <CommissionsView />
    </Suspense>
  );
}
