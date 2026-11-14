import { api } from '@/lib/api-client';
import { parsePaged } from '@/lib/paged';
import type { NotificationDTO } from './notifications.types';

export const fetchNotifications = (page: number, pageSize: number) =>
  api.get('/notifications', { params: { page, pageSize } }).then((r) => parsePaged<NotificationDTO>(r.data));

export const markNotificationRead = (id: string) =>
  api.post(`/notifications/${id}/read`).then((r) => r.data.data as { id: string });

export const markAllNotificationsRead = () =>
  api.post('/notifications/read-all').then((r) => r.data.data as { count: number });
