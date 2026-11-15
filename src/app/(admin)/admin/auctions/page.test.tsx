import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '@/features/admin/admin.api';
import * as depositsApi from '@/features/deposits/deposits.api';
import type { AdminAuction } from '@/features/admin/admin.types';
import AdminAuctionsPage from './page';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/admin/admin.api');
vi.mock('@/features/deposits/deposits.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/auctions',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));
vi.mock('@/features/auctions/components/auction-card', () => ({
  AuctionStatusBadge: () => <span>status</span>,
  CoverImage: () => null,
}));

const auction = {
  id: 'a1',
  title: 'Brass Vase',
  status: 'LIVE',
  startingBidPaise: 100000,
  currentBidPaise: 0,
  bidCount: 0,
  startTime: '2026-11-01T00:00:00Z',
  endTime: '2026-12-01T00:00:00Z',
  seller: { id: 's', name: 'Sam', avatarUrl: null },
  sellerEmail: 'sam@example.com',
  depositPaise: null,
} as unknown as AdminAuction;

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminAuctionsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.fetchAdminAuctions).mockResolvedValue({ items: [auction], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });
  vi.mocked(depositsApi.setAuctionDeposit).mockResolvedValue({});
});

describe('AdminAuctionsPage deposit action', () => {
  it('Set deposit opens a dialog and PATCHes paise', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Set deposit' }));
    await userEvent.type(await screen.findByLabelText('Deposit (₹)'), '2500');
    await userEvent.click(screen.getByRole('button', { name: 'Save deposit' }));
    await waitFor(() => expect(depositsApi.setAuctionDeposit).toHaveBeenCalledWith('a1', 250_000));
  });

  it('No deposit clears it (null)', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Set deposit' }));
    await userEvent.click(await screen.findByLabelText('No deposit'));
    await userEvent.click(screen.getByRole('button', { name: 'Save deposit' }));
    await waitFor(() => expect(depositsApi.setAuctionDeposit).toHaveBeenCalledWith('a1', null));
  });
});
