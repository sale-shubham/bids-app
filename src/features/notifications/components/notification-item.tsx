'use client';
import * as React from 'react';
import { formatDistanceStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { useServerNow } from '@/components/common/countdown';
import type { NotificationDTO } from '../notifications.types';

/** One notification row; unread ones get a dot and a tinted background. */
export function NotificationItem({
  n,
  onOpen,
  className,
}: {
  n: NotificationDTO;
  onOpen: (n: NotificationDTO) => void;
  className?: string;
}) {
  const now = useServerNow();
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        'flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-hidden',
        !n.readAt && 'bg-primary/5',
        className,
      )}
    >
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-primary')} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate', !n.readAt && 'font-semibold')}>{n.title}</span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {now === 0 ? ' ' : formatDistanceStrict(Date.parse(n.createdAt), now, { addSuffix: true })}
        </span>
      </span>
      {!n.readAt && <span className="sr-only">Unread</span>}
    </button>
  );
}

/** Mark-read + navigate, shared by the bell and the /notifications page. */
export function useOpenNotification(markRead: (id: string) => void, push: (path: string) => void) {
  return React.useCallback(
    (n: NotificationDTO) => {
      if (!n.readAt) markRead(n.id);
      if (!n.url) return;
      if (n.url.startsWith('/') && !n.url.startsWith('//')) push(n.url);
      else if (/^https?:\/\//i.test(n.url)) window.location.assign(n.url);
    },
    [markRead, push],
  );
}
