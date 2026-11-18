import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ markAll: vi.fn(), markRead: vi.fn(), open: vi.fn(), list: {} as Record<string, unknown> }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/notifications',
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));
vi.mock('@/features/notifications/components/notification-item', () => ({
  NotificationItem: () => <div />,
  useOpenNotification: () => m.open,
}));
vi.mock('@/features/notifications/use-notifications', () => ({
  useNotificationList: () => m.list,
  useUnreadCount: () => ({ data: 2 }),
  useMarkRead: () => ({ mutate: m.markRead }),
  useMarkAllRead: () => ({ mutate: m.markAll, isPending: false }),
}));

import NotificationsPage from './page';

const list = (items: unknown[], over: object = {}) => ({
  desktop: { isLoading: false, data: { items, meta: { total: items.length, page: 1, pageSize: 10, totalPages: 1 } } },
  mobile: { isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() },
  mobileItems: items,
  error: null,
  refetch: vi.fn(),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.list = list([]);
});

describe('Notifications page', () => {
  it('has Mark all read as the header action and the shared empty state', async () => {
    render(<NotificationsPage />);
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getAllByText('No notifications yet').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /Mark all read/ }));
    expect(m.markAll).toHaveBeenCalled();
  });
  it('shows an Unread badge and Mark read for unread rows', async () => {
    m.list = list([{ id: 'n1', type: 'x', title: 'Outbid', body: 'Someone topped you', url: '/auctions/a1', readAt: null, createdAt: '2026-01-01T00:00:00Z' }]);
    render(<NotificationsPage />);
    expect(screen.getByText('Unread')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Outbid' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Mark read' }));
    expect(m.markRead).toHaveBeenCalledWith('n1');
  });
  it('shows the shared error state', () => {
    m.list = list([], { error: new Error('x'), desktop: { isLoading: false, data: undefined }, mobile: { isLoading: false, data: undefined } });
    render(<NotificationsPage />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
