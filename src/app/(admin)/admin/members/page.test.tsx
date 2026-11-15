import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '@/features/admin/admin.api';
import type { AdminMember } from '@/features/admin/admin.types';
import AdminMembersPage from './page';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/admin/admin.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/members',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const member: AdminMember = {
  id: 'm1',
  name: 'Sam Seller',
  email: 'sam@example.com',
  phone: '9876543210',
  role: 'AUCTIONEER',
  isActive: true,
  emailVerifiedAt: '2026-10-01T00:00:00Z',
  createdAt: '2026-10-01T00:00:00Z',
  unpaidCommissionPaise: 0,
  auctionsWon: 0,
  moneySpentPaise: 0,
  verified: true,
  phoneVerifiedAt: '2026-10-02T00:00:00Z',
  twoFactorEnabled: true,
  payoutStatus: 'ACTIVE',
};
const page = (m: AdminMember) => ({ items: [m], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });

function setup() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminMembersPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.fetchMembers).mockResolvedValue(page(member));
  vi.mocked(adminApi.updateMember).mockResolvedValue({});
});

describe('AdminMembersPage verification', () => {
  it('shows trust badges', async () => {
    setup();
    expect(await screen.findByText('Phone verified')).toBeInTheDocument();
    expect(screen.getByText('2FA on')).toBeInTheDocument();
    expect(screen.getByText('Payout: active')).toBeInTheDocument();
  });

  it('revokes verification only after confirming', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: /Revoke verification/ }));
    expect(adminApi.updateMember).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(adminApi.updateMember).toHaveBeenCalledWith('m1', { verified: false }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Verification revoked'));
  });

  it('restores verification for an unverified member with a verified phone', async () => {
    vi.mocked(adminApi.fetchMembers).mockResolvedValue(page({ ...member, verified: false }));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: /Restore verification/ }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(adminApi.updateMember).toHaveBeenCalledWith('m1', { verified: true }));
  });
});
