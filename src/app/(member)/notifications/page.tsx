'use client';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScroll } from '@/components/common/infinite-scroll';
import { apiErrorMessage } from '@/lib/api-client';
import { NotificationItem, useOpenNotification } from '@/features/notifications/components/notification-item';
import { useMarkAllRead, useMarkRead, useNotificationList, useUnreadCount } from '@/features/notifications/use-notifications';

export default function NotificationsPage() {
  const router = useRouter();
  const list = useNotificationList();
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const onOpen = useOpenNotification(
    (id) => markRead.mutate(id),
    (path) => router.push(path),
  );
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Bids, outcomes and updates on your auctions.</p>
        </div>
        <Button variant="outline" size="sm" disabled={!unread.data || markAll.isPending} onClick={() => markAll.mutate()}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      {list.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">{apiErrorMessage(list.error, 'Could not load notifications')}</p>
          <Button variant="outline" onClick={() => void list.refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="You will be told here when you are outbid, win an auction or a sale completes." />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border">
          {items.map((n) => (
            <NotificationItem key={n.id} n={n} onOpen={onOpen} />
          ))}
        </div>
      )}

      <InfiniteScroll onLoadMore={() => void list.fetchNextPage()} hasMore={!!list.hasNextPage && !list.isFetchNextPageError} loading={list.isFetchingNextPage} />
    </div>
  );
}
