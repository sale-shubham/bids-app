'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nextPagedParam } from '@/lib/paged';
import { unreadCountKey, useUnreadMessageCount } from '@/features/push/use-push';
import { useAuthStore } from '@/store/auth-store';
import * as api from './notifications.api';

export const NOTIFICATIONS_PAGE_SIZE = 20;
export const BELL_LIMIT = 10;

/** Unread total (polled every 60 s while the tab is visible; shared with the app-icon badge). */
export const useUnreadCount = useUnreadMessageCount;

/** Latest notifications for the header dropdown; enable only while it is open. */
export function useLatestNotifications(enabled: boolean) {
  const isMember = useAuthStore((s) => !!s.member);
  return useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: () => api.fetchNotifications(1, BELL_LIMIT),
    enabled: enabled && isMember,
    staleTime: 0,
  });
}

/** Full paginated list for /notifications. */
export function useNotificationList() {
  return useInfiniteQuery({
    queryKey: ['notifications', 'list'],
    queryFn: ({ pageParam }) => api.fetchNotifications(pageParam, NOTIFICATIONS_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
  });
}

function useRefreshNotifications() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['notifications'] });
    void qc.invalidateQueries({ queryKey: unreadCountKey });
  };
}

export function useMarkRead() {
  const refresh = useRefreshNotifications();
  return useMutation({ mutationFn: (id: string) => api.markNotificationRead(id), onSuccess: refresh });
}

export function useMarkAllRead() {
  const refresh = useRefreshNotifications();
  return useMutation({ mutationFn: () => api.markAllNotificationsRead(), onSuccess: refresh });
}
