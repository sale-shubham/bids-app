'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Ban, Eye, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu';
import { AdminList, StatusTabs } from '@/features/admin/components/admin-list';
import { useUrlState } from '@/features/admin/use-url-state';
import { isStaleRiskError, riskErrorMessage } from '@/features/risk/risk.errors';
import type { RiskOutcome, RiskSignal, RiskTab } from '@/features/risk/risk.types';
import { riskReasonLabel, riskScoreVariant } from '@/features/risk/risk.utils';
import { useAdminRisk, useReviewRisk } from '@/features/risk/use-risk';
import { formatDate } from '@/lib/utils';

const TABS = [
  { value: 'open', label: 'Open' },
  { value: 'reviewed', label: 'Reviewed' },
];
const DEFAULTS = { tab: 'open' };
const OUTCOME_LABEL: Record<RiskOutcome, string> = { DISMISSED: 'Dismissed', ACTION_TAKEN: 'Action taken' };

function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge variant={riskScoreVariant(score)} aria-label={`Risk score ${score}`}>
      {score}
    </Badge>
  );
}

function Person({ p, label }: { p: RiskSignal['bidder']; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Link href={`/admin/members?q=${encodeURIComponent(p.email)}`} className="block truncate font-medium text-primary hover:underline">
        {p.name || p.email}
      </Link>
      <p className="truncate text-xs text-muted-foreground">{p.email}</p>
    </div>
  );
}

function Reasons({ r }: { r: RiskSignal }) {
  return (
    <ul className="space-y-0.5 text-sm">
      {r.reasons.map((x) => (
        <li key={x}>{riskReasonLabel(x)}</li>
      ))}
      {r.reviewedAt && (
        <li className="text-xs text-muted-foreground">
          {r.outcome ? OUTCOME_LABEL[r.outcome] : 'Reviewed'} · {formatDate(r.reviewedAt)}
        </li>
      )}
      {r.note && <li className="text-xs italic text-muted-foreground">Admin note: {r.note}</li>}
    </ul>
  );
}

function RiskView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const tab: RiskTab = values.tab === 'reviewed' ? 'reviewed' : 'open';
  const list = useAdminRisk({ tab }, page, pageSize);
  const review = useReviewRisk();

  const [dismissTarget, setDismissTarget] = React.useState<RiskSignal | null>(null);
  const [actionTarget, setActionTarget] = React.useState<RiskSignal | null>(null);
  const [note, setNote] = React.useState('');

  const run = (target: RiskSignal, outcome: RiskOutcome, done: () => void) =>
    review.mutate(
      { id: target.id, outcome, ...(note.trim() ? { note: note.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success(outcome === 'DISMISSED' ? 'Flag dismissed' : 'Marked as action taken');
          done();
        },
        onError: (e) => {
          toast.error(riskErrorMessage(e, 'Could not update the flag'));
          if (isStaleRiskError(e)) void list.refetch();
          done();
        },
      },
    );

  const openDialog = (kind: 'dismiss' | 'action', r: RiskSignal) => {
    setNote('');
    if (kind === 'dismiss') setDismissTarget(r);
    else setActionTarget(r);
  };

  const actions = (r: RiskSignal) => {
    const list: RowAction[] = [{ label: 'View auction', icon: Eye, href: `/auctions/${r.auction.id}` }];
    if (!r.reviewedAt) {
      list.push(
        { label: 'Dismiss', icon: Ban, onSelect: () => openDialog('dismiss', r) },
        { label: 'Mark action taken', icon: ShieldCheck, onSelect: () => openDialog('action', r) },
      );
    }
    return <RowActionsMenu name={r.auction.title} actions={list} />;
  };

  const noteField = (
    <div className="space-y-1.5">
      <Label htmlFor="risk-note">Note (optional)</Label>
      <Textarea id="risk-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Shill-bid risk" />

      <ListToolbar tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ tab: v })} />} />

      <AdminList<RiskSignal>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(r) => r.id}
        empty={{ icon: ShieldAlert, title: tab === 'open' ? 'No open flags' : 'No reviewed flags', description: 'Nothing to review here.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score</TableHead>
                <TableHead>Auction</TableHead>
                <TableHead>Bidder</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Why it was flagged</TableHead>
                <TableHead>Flagged</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <ScoreBadge score={r.score} />
                  </TableCell>
                  <TableCell className="max-w-56">
                    <Link href={`/auctions/${r.auction.id}`} className="line-clamp-2 font-medium hover:underline">
                      {r.auction.title}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-48">
                    <Person p={r.bidder} label="Bidder" />
                  </TableCell>
                  <TableCell className="max-w-48">
                    <Person p={r.seller} label="Seller" />
                  </TableCell>
                  <TableCell className="max-w-72">
                    <Reasons r={r} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(r.updatedAt || r.createdAt)}</TableCell>
                  <TableCell className="text-right">{actions(r)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(r) => (
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/auctions/${r.auction.id}`} className="min-w-0 font-medium wrap-break-word hover:underline">
                  {r.auction.title}
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <ScoreBadge score={r.score} />
                  {actions(r)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Person p={r.bidder} label="Bidder" />
                <Person p={r.seller} label="Seller" />
              </div>
              <Reasons r={r} />
              <p className="text-xs text-muted-foreground">Flagged {formatDate(r.updatedAt || r.createdAt)}</p>
            </CardContent>
          </Card>
        )}
      />

      <ConfirmDialog
        open={!!dismissTarget}
        onOpenChange={(o) => !o && setDismissTarget(null)}
        title="Dismiss this flag?"
        description="You judged this activity as legitimate. The flag moves to Reviewed."
        confirmLabel="Dismiss"
        loading={review.isPending}
        onConfirm={() => dismissTarget && run(dismissTarget, 'DISMISSED', () => setDismissTarget(null))}
      >
        {noteField}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && setActionTarget(null)}
        title="Mark action taken"
        description="Record that you handled this flag, for example by cancelling the auction or suspending the member."
        confirmLabel="Mark action taken"
        loading={review.isPending}
        onConfirm={() => actionTarget && run(actionTarget, 'ACTION_TAKEN', () => setActionTarget(null))}
      >
        {noteField}
      </ConfirmDialog>
    </div>
  );
}

export default function AdminRiskPage() {
  return (
    <Suspense>
      <RiskView />
    </Suspense>
  );
}
