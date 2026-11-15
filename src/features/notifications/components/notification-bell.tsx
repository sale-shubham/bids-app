'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CountBadge } from '@/components/common/count-badge';
import { useAppBadge } from '@/features/push/use-push';
import { useAuthStore } from '@/store/auth-store';
import { useLatestNotifications, useMarkAllRead, useMarkRead } from '../use-notifications';
import { NotificationItem, useOpenNotification } from './notification-item';

/** Header bell: unread badge + dropdown with the latest 10. Renders nothing for guests or SUPER_ADMIN (no /notifications for admins). */
export function NotificationBell() {
  const member = useAuthStore((s) => s.member);
  if (!member || member.role === 'SUPER_ADMIN') return null;
  return <MemberBell />;
}

function MemberBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const unread = useAppBadge(); // polls the count (60 s) and paints the app-icon badge
  const latest = useLatestNotifications(open);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const onOpen = useOpenNotification(
    (id) => markRead.mutate(id),
    (path) => {
      setOpen(false);
      router.push(path);
    },
  );
  const count = unread.data ?? 0;
  const items = latest.data?.items ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-5 w-5" />
          <CountBadge count={count} compact className="absolute -right-0.5 -top-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={count === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 divide-y overflow-y-auto">
          {latest.isPending ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : latest.isError ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Could not load notifications.</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You are all caught up.</p>
          ) : (
            items.map((n) => <NotificationItem key={n.id} n={n} onOpen={onOpen} />)
          )}
        </div>
        <div className="border-t p-1 text-center">
          <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            <Link href="/notifications">View all</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
