'use client';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PagedList } from '@/components/common/paged-list';
import { PageHeader } from '@/components/common/page-header';
import { RowActionsMenu, type RowAction } from '@/components/common/row-actions-menu';
import { useUrlState } from '@/features/admin/use-url-state';
import { NotificationItem, useOpenNotification } from '@/features/notifications/components/notification-item';
import type { NotificationDTO } from '@/features/notifications/notifications.types';
import { useMarkAllRead, useMarkRead, useNotificationList, useUnreadCount } from '@/features/notifications/use-notifications';
import { cn, formatListTime } from '@/lib/utils';

function NotificationsView() {
  const router = useRouter();
  const { page, pageSize, update } = useUrlState({});
  const list = useNotificationList(page, pageSize);
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const onOpen = useOpenNotification(
    (id) => markRead.mutate(id),
    (path) => router.push(path),
  );

  const actions = (n: NotificationDTO) => {
    const items: RowAction[] = [{ label: 'Open', icon: ExternalLink, onSelect: () => onOpen(n) }];
    if (!n.readAt) items.push({ label: 'Mark read', icon: CheckCheck, onSelect: () => markRead.mutate(n.id) });
    return <RowActionsMenu name={n.title} actions={items} />;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        action={
          <Button variant="outline" disabled={!unread.data || markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <PagedList<NotificationDTO>
        list={list}
        page={page}
        onPageChange={(p) => update({ page: String(p) })}
        onPageSizeChange={(s) => update({ pageSize: String(s) })}
        getKey={(n) => n.id}
        errorTitle="Could not load notifications"
        empty={{ icon: Bell, title: 'No notifications yet', description: 'You will be told here when you are outbid, win an auction or a sale completes.' }}
        renderTable={(items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Notification</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="max-w-lg">
                    <p className={cn('truncate', !n.readAt && 'font-semibold')}>{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatListTime(n.createdAt)}</TableCell>
                  <TableCell>{!n.readAt && <Badge variant="default" dot>Unread</Badge>}</TableCell>
                  <TableCell className="text-right">{actions(n)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        renderCard={(n) => (
          <Card className="overflow-hidden">
            <NotificationItem n={n} onOpen={onOpen} />
          </Card>
        )}
      />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsView />
    </Suspense>
  );
}
