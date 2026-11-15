import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/reports/reports.api';
import type { AdminReport } from '@/features/reports/reports.types';
import AdminReportsPage from './page';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/reports/reports.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/reports',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const report: AdminReport = {
  id: 'r1',
  targetType: 'AUCTION',
  targetId: 'a1',
  reason: 'COUNTERFEIT',
  details: 'Looks fake',
  status: 'OPEN',
  createdAt: '2026-11-01T00:00:00Z',
  resolvedAt: null,
  note: null,
  reporter: { id: 'u1', name: 'Ravi', email: 'ravi@example.com' },
  target: { label: 'Brass Vase', url: '/auctions/a1' },
  openCountForTarget: 3,
  priority: 'HIGH',
};

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminReportsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchAdminReports).mockResolvedValue({ items: [report], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });
  vi.mocked(api.resolveReport).mockResolvedValue({ resolvedCount: 1 });
});

describe('AdminReportsPage', () => {
  it('lists the report with priority, target link, reporter, reason, details and moderation link', async () => {
    setup();
    expect(await screen.findByRole('link', { name: /Brass Vase/ })).toHaveAttribute('href', '/auctions/a1');
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Fake or counterfeit item')).toBeInTheDocument();
    expect(screen.getByText('Looks fake')).toBeInTheDocument();
    expect(screen.getByText('ravi@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancel auction' })).toHaveAttribute('href', '/admin/auctions?q=Brass%20Vase');
  });

  it('dismisses only after confirming', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(api.resolveReport).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(api.resolveReport).toHaveBeenCalledWith({ id: 'r1', status: 'DISMISSED' }, expect.anything()));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Report dismissed'));
  });

  it('mark action taken sends the note and apply-to-all', async () => {
    vi.mocked(api.resolveReport).mockResolvedValue({ resolvedCount: 3 });
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Mark action taken' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Note/), 'Auction cancelled');
    await userEvent.click(within(dialog).getByLabelText(/Apply to all open reports/));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark action taken' }));
    await waitFor(() =>
      expect(api.resolveReport).toHaveBeenCalledWith({
        id: 'r1',
        status: 'ACTION_TAKEN',
        note: 'Auction cancelled',
        applyToAllOpenForTarget: true,
      }, expect.anything()),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3 reports resolved'));
  });
});
