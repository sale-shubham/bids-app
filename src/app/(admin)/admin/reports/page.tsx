'use client';
import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { Ban, CheckCircle2, ExternalLink, EyeOff, Flag, UserCog, X, type LucideIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FilterSelect, ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu';
import { AdminList, StatusTabs } from '@/features/admin/components/admin-list';
import { useUrlState } from '@/features/admin/use-url-state';
import { REPORT_REASON_LABEL, REPORT_TARGET_LABEL } from '@/features/reports/reports.constants';
import { REPORT_NOTE_MAX } from '@/features/reports/reports.constants';
import { reportErrorMessage } from '@/features/reports/reports.errors';
import { questionErrorMessage } from '@/features/questions/questions.errors';
import { hideQuestion } from '@/features/questions/questions.api';
import { REPORT_TARGET_TYPES, type AdminReport, type ReportStatus } from '@/features/reports/reports.types';
import { useAdminReports, useResolveReport } from '@/features/reports/use-reports';
import { formatDate } from '@/lib/utils';

const TABS = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
];
const DEFAULTS = { tab: 'open', targetType: '', outcome: 'ACTION_TAKEN' };
// Outcome select has no "all" option. Action taken is the default and is stored as no param.
const OUTCOMES = [
  { value: 'ACTION_TAKEN', label: 'Action taken' },
  { value: 'DISMISSED', label: 'Dismissed' },
];
const TARGET_TYPES = REPORT_TARGET_TYPES.map((t) => ({ value: t as string, label: REPORT_TARGET_LABEL[t] }));

// Existing moderation screens per target type (cancel auction, suspend member, hide review).
// Questions are hidden in place (the "Hide question" entry in `actions`).
function moderationLink(r: AdminReport): { href: string; label: string; icon: LucideIcon } | null {
  const q = encodeURIComponent(r.target.label);
  if (r.targetType === 'AUCTION') return { href: `/admin/auctions?q=${q}`, label: 'Cancel auction', icon: Ban };
  if (r.targetType === 'MEMBER') return { href: `/admin/members?q=${q}`, label: 'Manage member', icon: UserCog };
  if (r.targetType === 'REVIEW') return { href: '/admin/reviews', label: 'Hide review', icon: EyeOff };
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
  const qc = useQueryClient();
  const hide = useMutation({
    mutationFn: (questionId: string) => hideQuestion(questionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      void qc.invalidateQueries({ queryKey: ['questions'] });
    },
  });

  const [hideTarget, setHideTarget] = React.useState<AdminReport | null>(null);
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

  const confirmHideQuestion = () => {
    if (!hideTarget) return;
    hide.mutate(hideTarget.targetId, {
      onSuccess: () => {
        toast.success('Question hidden');
        setHideTarget(null);
      },
      onError: (e) => {
        toast.error(questionErrorMessage(e, 'Could not hide the question'));
        setHideTarget(null);
      },
    });
  };

  const confirmDismiss = () => dismissTarget && run(dismissTarget, 'DISMISSED', {}, () => setDismissTarget(null));
  const confirmAction = () =>
    actionTarget &&
    run(actionTarget, 'ACTION_TAKEN', { ...(note.trim() ? { note: note.trim() } : {}), ...(applyToAll ? { applyToAllOpenForTarget: true } : {}) }, () => setActionTarget(null));

  const actions = (r: AdminReport) => {
    const mod = moderationLink(r);
    const items: RowAction[] = [];
    if (r.status === 'OPEN') {
      items.push({ label: 'Dismiss', icon: X, onSelect: () => setDismissTarget(r) });
      items.push({ label: 'Mark action taken', icon: CheckCircle2, onSelect: () => openAction(r) });
    }
    if (mod) items.push({ label: mod.label, icon: mod.icon, href: mod.href, separated: items.length > 0 });
    if (r.targetType === 'QUESTION') items.push({ label: 'Hide question', icon: EyeOff, destructive: true, separated: items.length > 0, onSelect: () => setHideTarget(r) });
    return <RowActionsMenu name={`${REPORT_TARGET_LABEL[r.targetType]} ${r.target.label}`} actions={items} />;
  };

  const statusText = (r: AdminReport) =>
    r.status === 'OPEN' ? 'Open' : `${STATUS_LABEL[r.status]}${r.resolvedAt ? ` · ${formatDate(r.resolvedAt)}` : ''}`;

  const reasonCell = (r: AdminReport) => (
    <div className="space-y-1">
      <p className="font-medium">{REPORT_REASON_LABEL[r.reason]}</p>
      {r.details && <p className="whitespace-pre-line wrap-break-word text-xs text-muted-foreground">{r.details}</p>}
      {r.note && <p className="text-xs italic text-muted-foreground">Admin note: {r.note}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" />

      <ListToolbar
        tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ tab: v })} />}
        activeFilters={[tab === 'resolved' && outcome !== 'ACTION_TAKEN', targetType].filter(Boolean).length}
        onClearFilters={() => update({ targetType: '', outcome: '' })}
      >
        {tab === 'resolved' && (
          <FilterSelect
            value={outcome}
            onChange={(v) => update({ outcome: v === 'DISMISSED' ? 'DISMISSED' : '' })}
            options={OUTCOMES}
            includeAll={false}
            ariaLabel="Outcome"
          />
        )}
        <FilterSelect value={targetType} onChange={(v) => update({ targetType: v })} options={TARGET_TYPES} allLabel="All types" ariaLabel="Target type" />
      </ListToolbar>

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
                <TableHead>Status</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
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
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{statusText(r)}</TableCell>
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
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{REPORT_TARGET_LABEL[r.targetType]}</p>
                  <TargetLink r={r} />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <PriorityBadge priority={r.priority} />
                  {actions(r)}
                </div>
              </div>
              {reasonCell(r)}
              <p className="text-xs text-muted-foreground">
                By {r.reporter.name} ({r.reporter.email}) · {formatDate(r.createdAt)} · {r.openCountForTarget} open for this target
              </p>
              {r.status !== 'OPEN' && <p className="text-xs text-muted-foreground">{statusText(r)}</p>}
            </CardContent>
          </Card>
        )}
      />

      <ConfirmDialog
        open={!!hideTarget}
        onOpenChange={(o) => !o && setHideTarget(null)}
        title="Hide this question?"
        description="It will no longer be shown to anyone on the auction. This does not resolve the report."
        confirmLabel="Hide question"
        variant="destructive"
        loading={hide.isPending}
        onConfirm={confirmHideQuestion}
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
            <Textarea id="report-note" rows={3} maxLength={REPORT_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
            <p className="text-right text-xs text-muted-foreground">
              {note.length}/{REPORT_NOTE_MAX}
            </p>
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
