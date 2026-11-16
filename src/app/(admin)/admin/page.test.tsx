import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '@/features/admin/admin.api';
import AdminDashboardPage from './page';

vi.mock('@/features/admin/admin.api');
vi.mock('@/features/admin/components/admin-charts', () => ({
  RevenueBarChart: () => <div>revenue chart</div>,
  SignupsLineChart: () => <div>signups chart</div>,
}));

const totals = {
  members: 10, bidders: 6, auctioneers: 4, liveAuctions: 2, upcomingAuctions: 1, endedAuctions: 3,
  bidsToday: 7, commissionPaidPaise: 100000, commissionDuePaise: 5000,
};

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminDashboardPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.fetchDashboard).mockResolvedValue({ totals, revenueByMonth: [], signupsByMonth: [], recentAuctions: [] } as never);
});

describe('AdminDashboardPage', () => {
  it('shows the figures with their links and empty states for the charts', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
    expect(screen.queryByText(/Platform activity at a glance/)).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Members/ })).toHaveAttribute('href', '/admin/members');
    expect(screen.getByRole('link', { name: /Commission due/ })).toHaveAttribute('href', '/admin/commissions?status=due');
    expect(screen.getByRole('link', { name: /Live auctions/ })).toHaveAttribute('href', '/admin/auctions?status=live');
    expect(screen.getByText('No revenue yet')).toBeInTheDocument();
    expect(screen.getByText('No signups yet')).toBeInTheDocument();
    expect(screen.getByText('No auctions yet')).toBeInTheDocument();
  });

  it('shows Try again when loading fails', async () => {
    vi.mocked(adminApi.fetchDashboard).mockRejectedValue(new Error('boom'));
    setup();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
