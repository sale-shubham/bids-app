'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { apiErrorCode } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { strikeErrorMessage } from '../strikes.errors';
import type { StrikeDTO } from '../strikes.types';
import { useMemberStrikes, useRemoveStrike } from '../use-strikes';

function StateBadge({ s }: { s: StrikeDTO }) {
  if (s.removedAt) return <Badge variant="secondary">Removed {formatDate(s.removedAt)}</Badge>;
  if (!s.active) return <Badge variant="outline">Expired</Badge>;
  return <Badge variant="warning">Active</Badge>;
}

/** Admin: a member's strikes with a Remove action (ConfirmDialog + optional note). */
export function MemberStrikesDialog({ member, onClose }: { member: { id: string; name: string; email: string } | null; onClose: () => void }) {
  const memberId = member?.id ?? '';
  const list = useMemberStrikes(memberId, !!member);
  const remove = useRemoveStrike(memberId);
  const [target, setTarget] = React.useState<StrikeDTO | null>(null);
  const [note, setNote] = React.useState('');

  const confirmRemove = () => {
    if (!target) return;
    remove.mutate(
      { id: target.id, ...(note.trim() ? { note: note.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success('Strike removed');
          setTarget(null);
          setNote('');
        },
        onError: (e) => {
          toast.error(strikeErrorMessage(e, 'Could not remove the strike'));
          const code = apiErrorCode(e);
          if (code === 'STRIKE_ALREADY_REMOVED' || code === 'STRIKE_NOT_FOUND') void list.refetch();
          setTarget(null);
        },
      },
    );
  };

  return (
    <>
      <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Strikes</DialogTitle>
            <DialogDescription>{member ? `Unpaid-purchase strikes for ${member.email}.` : undefined}</DialogDescription>
          </DialogHeader>
          {list.isPending ? (
            <Skeleton className="h-24" />
          ) : list.error ? (
            <p className="text-sm text-destructive">{strikeErrorMessage(list.error, 'Could not load strikes')}</p>
          ) : (list.data ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No strikes.</p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {(list.data ?? []).map((s) => (
                <li key={s.id} className="space-y-1 rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">Unpaid purchase</span>
                      <StateBadge s={s} />
                    </div>
                    {s.active && (
                      <Button size="sm" variant="outline" onClick={() => setTarget(s)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  {s.auction && <p className="wrap-break-word text-muted-foreground">{s.auction.title}</p>}
                  <p className="text-xs text-muted-foreground">
                    Issued {formatDate(s.createdAt)} · expires {formatDate(s.expiresAt)}
                  </p>
                  {s.note && <p className="text-xs italic text-muted-foreground">Note: {s.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && !remove.isPending && setTarget(null)}
        title="Remove this strike?"
        description="The strike stops counting toward deposits and suspension. This does not reactivate a suspended account."
        confirmLabel="Remove strike"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={confirmRemove}
      >
        <div className="space-y-1.5">
          <Label htmlFor="strike-note">Note (optional)</Label>
          <Textarea id="strike-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>
    </>
  );
}
