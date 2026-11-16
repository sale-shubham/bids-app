import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ markAll: vi.fn(), list: {} as Record<string, unknown> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/notifications/components/notification-item', () => ({
  NotificationItem: () => <div />,
  useOpenNotification: () => vi.fn(),
}));
vi.mock('@/features/notifications/use-notifications', () => ({
  useNotificationList: () => m.list,
  useUnreadCount: () => ({ data: 2 }),
  useMarkRead: () => ({ mutate: vi.fn() }),
  useMarkAllRead: () => ({ mutate: m.markAll, isPending: false }),
}));

import NotificationsPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  m.list = { isPending: false, isError: false, data: { pages: [{ items: [] }] }, refetch: vi.fn() };
});

describe('Notifications page', () => {
  it('has Mark all read as the header action and the shared empty state', async () => {
    render(<NotificationsPage />);
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Mark all read/ }));
    expect(m.markAll).toHaveBeenCalled();
  });
  it('shows the shared error state', () => {
    m.list = { isPending: false, isError: true, error: new Error('x'), refetch: vi.fn() };
    render(<NotificationsPage />);
    expect(screen.getByText('Could not load notifications')).toBeInTheDocument();
  });
});
