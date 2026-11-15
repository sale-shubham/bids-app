'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { ExternalLink, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { AdminList, PageHeader, StatusTabs } from '@/features/admin/components/admin-list';
import { useUrlState } from '@/features/admin/use-url-state';
import { REPORT_REASON_LABEL, REPORT_TARGET_LABEL } from '@/features/reports/reports.constants';
import { reportErrorMessage } from '@/features/reports/reports.errors';
import { REPORT_TARGET_TYPES, type AdminReport, type ReportStatus } from '@/features/reports/reports.types';
import { useAdminReports, useResolveReport } from '@/features/reports/use-reports';
import { formatDate } from '@/lib/utils';

const TABS = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
];
const DEFAULTS = { tab: 'open', targetType: '', outcome: 'ACTION_TAKEN' };

// Existing moderation screens per target type (cancel auction, suspend member, hide review).
// Questions have no admin screen: the seller hides them from the auction page.
function moderationLink(r: AdminReport): { href: string; label: string } | null {
  const q = encodeURIComponent(r.target.label);
  if (r.targetType === 'AUCTION') return { href: `/admin/auctions?q=${q}`, label: 'Cancel auction' };
  if (r.targetType === 'MEMBER') return { href: `/admin/members?q=${q}`, label: 'Manage member' };
  if (r.targetType === 'REVIEW') return { href: '/admin/reviews', label: 'Hide review' };
  return null;
}

function TargetLink({ r }: { r: AdminReport }) {
  if (!r.target.url) return <span className="text-muted-foreground">{r.target.label}</span>;
  return (
    <Link href={r.target.url} className="inline-flex max-w-full items-center gap-1 font-medium text-primary hover:underline">
      <span className="truncate">{r.target.label}</span>
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
    </Link>
  );
}

function PriorityBadge({ priority }: { priority: AdminReport['priority'] }) {
  return priority === 'HIGH' ? <Badge variant="destructive">High</Badge> : <Badge variant="secondary">Normal</Badge>;
}

const STATUS_LABEL: Record<ReportStatus, string> = { OPEN: 'Open', ACTION_TAKEN: 'Action taken', DISMISSED: 'Dismissed' };

function ReportsView() {
  const { values, page, pageSize, update } = useUrlState(DEFAULTS);
  const tab = TABS.some((t) => t.value === values.tab) ? values.tab : 'open';
  const outcome = values.outcome === 'DISMISSED' ? 'DISMISSED' : 'ACTION_TAKEN';
  const targetType = (REPORT_TARGET_TYPES as readonly string[]).includes(values.targetType) ? values.targetType : '';
  const list = useAdminReports({ tab, targetType, outcome }, page, pageSize);
  const resolve = useResolveReport();

  const [dismissTarget, setDismissTarget] = React.useState<AdminReport | null>(null);
  const [actionTarget, setActionTarget] = React.useState<AdminReport | null>(null);
  const [note, setNote] = React.useState('');
  const [applyToAll, setApplyToAll] = React.useState(false);

  const openAction = (r: AdminReport) => {
    setNote('');
    setApplyToAll(false);
    setActionTarget(r);
  };

  const run = (target: AdminReport, status: 'ACTION_TAKEN' | 'DISMISSED', extra: { note?: string; applyToAllOpenForTarget?: boolean }, done: () => void) =>
    resolve.mutate(
      { id: target.id, status, ...extra },
      {
        onSuccess: (res) => {
          toast.success(res.resolvedCount > 1 ? `${res.resolvedCount} reports resolved` : status === 'DISMISSED' ? 'Report dismissed' : 'Marked as action taken');
          done();
        },
        onError: (e) => {
          toast.error(reportErrorMessage(e, 'Could not update the report'));
          done();
        },
      },
    );

  const confirmDismiss = () => dismissTarget && run(dismissTarget, 'DISMISSED', {}, () => setDismissTarget(null));
  const confirmAction = () =>
    actionTarget &&
    run(actionTarget, 'ACTION_TAKEN', { ...(note.trim() ? { note: note.trim() } : {}), ...(applyToAll ? { applyToAllOpenForTarget: true } : {}) }, () => setActionTarget(null));

  const actions = (r: AdminReport) => {
    const mod = moderationLink(r);
    return (
      <div className="flex flex-wrap items-center gap-2">
        {mod && (
          <Button asChild size="sm" variant="outline">
            <Link href={mod.href}>{mod.label}</Link>
          </Button>
        )}
        {r.status === 'OPEN' ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setDismissTarget(r)}>
              Dismiss
            </Button>
            <Button size="sm" onClick={() => openAction(r)}>
              Mark action taken
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {STATUS_LABEL[r.status]}
            {r.resolvedAt ? ` · ${formatDate(r.resolvedAt)}` : ''}
          </span>
        )}
      </div>
    );
  };

  const reasonCell = (r: AdminReport) => (
    <div className="space-y-1">
      <p className="font-medium">{REPORT_REASON_LABEL[r.reason]}</p>
      {r.details && <p className="whitespace-pre-line wrap-break-word text-xs text-muted-foreground">{r.details}</p>}
      {r.note && <p className="text-xs italic text-muted-foreground">Admin note: {r.note}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Reports from members. Review the target, use the moderation actions, then resolve." />

      <div className="flex flex-col gap-3 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between">
        <StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ tab: v })} />
        <div className="flex flex-col gap-3 @lg/content:flex-row">
          {tab === 'resolved' && (
            <Select value={outcome} onValueChange={(v) => update({ outcome: v })}>
              <SelectTrigger className="w-full @lg/content:w-44" aria-label="Outcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTION_TAKEN">Action taken</SelectItem>
                <SelectItem value="DISMISSED">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={targetType || 'all'} onValueChange={(v) => update({ targetType: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-full @lg/content:w-44" aria-label="Target type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {REPORT_TARGET_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {REPORT_TARGET_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AdminList<AdminReport>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(r) => r.id}
        empty={{ icon: Flag, title: tab === 'open' ? 'No open reports' : 'No resolved reports', description: 'Nothing to review here.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead className="text-right">Open reports</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <PriorityBadge priority={r.priority} />
                  </TableCell>
                  <TableCell className="max-w-56">
                    <p className="text-xs text-muted-foreground">{REPORT_TARGET_LABEL[r.targetType]}</p>
                    <TargetLink r={r} />
                  </TableCell>
                  <TableCell className="max-w-72">{reasonCell(r)}</TableCell>
                  <TableCell className="max-w-48">
                    <p className="truncate">{r.reporter.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.reporter.email}</p>
                  </TableCell>
                  <TableCell className="text-right tnum">{r.openCountForTarget}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
                  <TableCell>{actions(r)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(r) => (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{REPORT_TARGET_LABEL[r.targetType]}</p>
                  <TargetLink r={r} />
                </div>
                <PriorityBadge priority={r.priority} />
              </div>
              {reasonCell(r)}
              <p className="text-xs text-muted-foreground">
                By {r.reporter.name} ({r.reporter.email}) · {formatDate(r.createdAt)} · {r.openCountForTarget} open for this target
              </p>
              {actions(r)}
            </CardContent>
          </Card>
        )}
      />

      <ConfirmDialog
        open={!!dismissTarget}
        onOpenChange={(o) => !o && setDismissTarget(null)}
        title="Dismiss this report?"
        description="No action will be taken. The reporter is not notified."
        confirmLabel="Dismiss"
        loading={resolve.isPending}
        onConfirm={confirmDismiss}
      />

      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && setActionTarget(null)}
        title="Mark action taken"
        description="Record that you handled this report, for example by cancelling the auction or suspending the member."
        confirmLabel="Mark action taken"
        loading={resolve.isPending}
        onConfirm={confirmAction}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-note">Note (optional)</Label>
            <Textarea id="report-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-primary" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />
            Apply to all open reports for this target
            {actionTarget && actionTarget.openCountForTarget > 1 ? ` (${actionTarget.openCountForTarget})` : ''}
          </label>
        </div>
      </ConfirmDialog>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense>
      <ReportsView />
    </Suspense>
  );
}
