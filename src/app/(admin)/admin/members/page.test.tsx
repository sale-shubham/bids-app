import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '@/features/admin/admin.api';
import * as strikesApi from '@/features/strikes/strikes.api';
import type { AdminMember } from '@/features/admin/admin.types';
import AdminMembersPage from './page';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const urlQuery = vi.hoisted(() => ({ value: '' }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/admin/admin.api');
vi.mock('@/features/strikes/strikes.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/members',
  useSearchParams: () => new URLSearchParams(urlQuery.value),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const member: AdminMember = {
  id: 'm1',
  name: 'Sam Seller',
  email: 'sam@example.com',
  phone: '9876543210',
  role: 'MEMBER',
  isActive: true,
  emailVerifiedAt: '2026-10-01T00:00:00Z',
  createdAt: '2026-10-01T00:00:00Z',
  unpaidCommissionPaise: 0,
  auctionsWon: 0,
  moneySpentPaise: 0,
  verified: true,
  payoutStatus: 'ACTIVE',
  activeStrikes: 0,
  creditBalancePaise: 0,
  auctionsListed: 4,
};
const page = (m: AdminMember) => ({ items: [m], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });

async function pick(name: RegExp | string) {
  await userEvent.click(await screen.findByRole('button', { name: 'Actions for Sam Seller' }));
  await userEvent.click(await screen.findByRole('menuitem', { name }));
}

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminMembersPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  urlQuery.value = '';
  vi.mocked(adminApi.fetchMembers).mockResolvedValue(page(member));
  vi.mocked(adminApi.updateMember).mockResolvedValue({});
});

describe('AdminMembersPage verification', () => {
  it('shows trust badges', async () => {
    setup();
    expect((await screen.findAllByText('Verified')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Phone|2FA/)).not.toBeInTheDocument();
    expect(screen.getByText('Payout: active')).toBeInTheDocument();
  });

  it('revokes verification only after confirming', async () => {
    setup();
    await pick(/Revoke verification/);
    expect(adminApi.updateMember).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(adminApi.updateMember).toHaveBeenCalledWith('m1', { verified: false }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Verification revoked'));
  });

  it('restores verification for an unverified auctioneer with an ACTIVE payout account', async () => {
    vi.mocked(adminApi.fetchMembers).mockResolvedValue(page({ ...member, verified: false }));
    setup();
    await pick(/Restore verification/);
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(adminApi.updateMember).toHaveBeenCalledWith('m1', { verified: true }));
  });
});

describe('AdminMembersPage strikes', () => {
  it('shows the strike count and opens the Strikes dialog with the member strikes', async () => {
    vi.mocked(adminApi.fetchMembers).mockResolvedValue(page({ ...member, activeStrikes: 2 }));
    vi.mocked(strikesApi.fetchMemberStrikes).mockResolvedValue([
      { id: 'k1', saleId: 's1', auction: { id: 'a1', title: 'Brass Vase' }, reason: 'UNPAID', createdAt: '2026-10-01T00:00:00Z', expiresAt: '2027-10-01T00:00:00Z', removedAt: null, note: null, active: true },
    ]);
    setup();
    expect(await screen.findByText('2 strikes')).toBeInTheDocument();
    await pick(/Strikes \(2\)/);
    expect(strikesApi.fetchMemberStrikes).toHaveBeenCalledWith('m1');
    expect(await screen.findByText('Brass Vase')).toBeInTheDocument();
  });

  it('removes a strike through the confirm dialog', async () => {
    vi.mocked(adminApi.fetchMembers).mockResolvedValue(page({ ...member, activeStrikes: 1 }));
    vi.mocked(strikesApi.fetchMemberStrikes).mockResolvedValue([
      { id: 'k1', saleId: 's1', auction: null, reason: 'UNPAID', createdAt: '2026-10-01T00:00:00Z', expiresAt: '2027-10-01T00:00:00Z', removedAt: null, note: null, active: true },
    ]);
    vi.mocked(strikesApi.removeStrike).mockResolvedValue({});
    setup();
    await pick(/Strikes \(1\)/);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(strikesApi.removeStrike).not.toHaveBeenCalled();
    const dialogs = await screen.findAllByRole('dialog');
    await userEvent.click(within(dialogs.at(-1)!).getByRole('button', { name: 'Remove strike' }));
    await waitFor(() => expect(strikesApi.removeStrike).toHaveBeenCalledWith('k1', undefined));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Strike removed'));
  });
});

describe('AdminMembersPage layout and filters', () => {
  it('renders only the header, filters and list, with a header title and no description', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Members' })).toBeInTheDocument();
    expect(screen.queryByText(/Search, activate and manage/)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filters' })).toBeInTheDocument();
  });

  it('has a Selling filter (All / Sellers / Non-sellers) and no Role filter', async () => {
    setup();
    await screen.findByText('Sam Seller');
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    expect(screen.queryByRole('combobox', { name: 'Role' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Selling' }));
    expect(await screen.findByRole('option', { name: 'Sellers' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Non-sellers' })).toBeInTheDocument();
  });

  it('sends a valid ?seller= to the API and drops an invalid one', async () => {
    urlQuery.value = 'seller=true';
    setup();
    await screen.findByText('Sam Seller');
    expect(vi.mocked(adminApi.fetchMembers).mock.calls[0][0]).toMatchObject({ seller: 'true' });
    cleanup();
    vi.mocked(adminApi.fetchMembers).mockClear();
    urlQuery.value = 'seller=maybe&role=BIDDER';
    setup();
    await screen.findByText('Sam Seller');
    const f = vi.mocked(adminApi.fetchMembers).mock.calls[0][0];
    expect(f.seller).toBe('');
    expect(f).not.toHaveProperty('role');
  });

  it('shows how many auctions the member has listed, and no role column', async () => {
    setup();
    await screen.findByText('Sam Seller');
    expect(screen.getByRole('columnheader', { name: 'Listed' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Role' })).not.toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('offers the verification action on an ACTIVE payout account with no role check', async () => {
    vi.mocked(adminApi.fetchMembers).mockResolvedValue(page({ ...member, verified: false, payoutStatus: 'ACTIVE' }));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Sam Seller' }));
    expect(await screen.findByRole('menuitem', { name: 'Restore verification' })).toBeInTheDocument();
  });

  it('hides the verification action without an ACTIVE payout account', async () => {
    vi.mocked(adminApi.fetchMembers).mockResolvedValue(page({ ...member, verified: false, payoutStatus: null }));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Sam Seller' }));
    await screen.findByRole('menuitem', { name: 'Deactivate' });
    expect(screen.queryByRole('menuitem', { name: /verification/ })).not.toBeInTheDocument();
  });

  it('lists the existing actions in the row menu, with Deactivate and Adjust credits', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Sam Seller' }));
    for (const n of ['Deactivate', 'Strikes', 'Adjust credits', 'Revoke verification'])
      expect(await screen.findByRole('menuitem', { name: n })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Role' })).not.toBeInTheDocument();
  });

  it('deactivates only after confirming', async () => {
    setup();
    await pick('Deactivate');
    expect(adminApi.updateMember).not.toHaveBeenCalled();
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(adminApi.updateMember).toHaveBeenCalledWith('m1', { isActive: false }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Member deactivated'));
  });

  it('shows Try again when the list fails', async () => {
    vi.mocked(adminApi.fetchMembers).mockRejectedValue(new Error('boom'));
    setup();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
