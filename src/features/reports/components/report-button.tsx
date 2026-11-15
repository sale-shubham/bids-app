'use client';
import * as React from 'react';
import Link from 'next/link';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthHref } from '@/hooks/use-login-href';
import { useAuthStore } from '@/store/auth-store';
import type { ReportTargetType } from '../reports.types';
import { ReportDialog } from './report-dialog';

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  subject: string;
  /** Hide the button (e.g. the viewer owns the target). */
  hidden?: boolean;
  /** The target's owner: the button is hidden when the viewer is that member. */
  ownerId?: string;
  className?: string;
}

// Small "Report" action. Logged-out users get a login prompt instead of the dialog.
export function ReportButton({ targetType, targetId, subject, hidden, ownerId, className }: ReportButtonProps) {
  const member = useAuthStore((s) => s.member);
  const loginHref = useAuthHref('/login');
  const [open, setOpen] = React.useState(false);
  if (hidden || (ownerId && member?.id === ownerId)) return null;

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className={className ?? 'text-muted-foreground'} onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" /> Report
      </Button>
      {member ? (
        <ReportDialog targetType={targetType} targetId={targetId} subject={subject} open={open} onOpenChange={setOpen} />
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log in to report</DialogTitle>
              <DialogDescription>You need to be logged in to report {subject}.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button asChild>
                <Link href={loginHref}>Log in</Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
