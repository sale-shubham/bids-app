import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '@/features/admin/admin.api';
import type { AdminCommission } from '@/features/admin/admin.types';
import AdminCommissionsPage from './page';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/admin/admin.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/commissions',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const commission = (over: Partial<AdminCommission> = {}): AdminCommission => ({
  id: 'c1',
  auctionId: 'a1',
  auction: { id: 'a1', title: 'Brass Vase', coverImage: null, finalBidPaise: 100000, endedAt: '2026-11-01T00:00:00Z' },
  rateBps: 500,
  amountPaise: 5000,
  status: 'DUE',
  dueAt: '2026-11-08T00:00:00Z',
  paidAt: null,
  createdAt: '2026-11-01T00:00:00Z',
  isOverdue: false,
  waivedNote: null,
  seller: { id: 's1', name: 'Sam', email: 'sam@example.com' },
  ...over,
});

async function openWaive() {
  await userEvent.click(await screen.findByRole('button', { name: 'Actions for Brass Vase' }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Waive' }));
}

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminCommissionsPage />
    </QueryClientProvider>,
  );
}

const page = (items: AdminCommission[]) => ({ items, meta: { total: items.length, page: 1, pageSize: 10, totalPages: 1 } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.fetchAdminCommissions).mockResolvedValue(page([commission()]));
  vi.mocked(adminApi.waiveCommission).mockResolvedValue({});
});

describe('AdminCommissionsPage waive', () => {
  it('labels the reason as saved and sends it with the waive call', async () => {
    setup();
    await openWaive();
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Reason (saved with the commission)'), '  Goodwill after dispute ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Waive commission' }));
    await waitFor(() => expect(adminApi.waiveCommission).toHaveBeenCalledWith('c1', 'Goodwill after dispute'));
  });

  it('works without a reason (no note sent)', async () => {
    setup();
    await openWaive();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Waive commission' }));
    await waitFor(() => expect(adminApi.waiveCommission).toHaveBeenCalledWith('c1', undefined));
  });

  it('blocks a 1-2 character reason (the API needs 3 to 200)', async () => {
    setup();
    await openWaive();
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByLabelText('Reason (saved with the commission)');
    expect(input).toHaveAttribute('maxlength', '200');
    await userEvent.type(input, 'ab');
    expect(within(dialog).getByText(/at least 3 characters/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Waive commission' }));
    expect(adminApi.waiveCommission).not.toHaveBeenCalled();
  });

  it('shows the saved note on WAIVED rows only', async () => {
    vi.mocked(adminApi.fetchAdminCommissions).mockResolvedValue(
      page([
        commission({ id: 'c2', status: 'WAIVED', waivedNote: 'Goodwill after dispute' }),
        commission({ id: 'c3', status: 'PAID', waivedNote: 'stale' }),
      ]),
    );
    setup();
    expect(await screen.findByText('Waived: Goodwill after dispute')).toBeInTheDocument();
    expect(screen.queryByText(/stale/)).not.toBeInTheDocument();
  });
});

describe('AdminCommissionsPage layout', () => {
  it('has a title-only header, tabs in the toolbar and no actions menu on paid rows', async () => {
    vi.mocked(adminApi.fetchAdminCommissions).mockResolvedValue(page([commission({ status: 'PAID' })]));
    setup();
    expect(await screen.findByRole('heading', { name: 'Commissions' })).toBeInTheDocument();
    expect(screen.queryByText(/Commission owed by auctioneers/)).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Filters' })).getByRole('tab', { name: 'Due' })).toBeInTheDocument();
    await screen.findByText('Brass Vase');
    expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument();
  });

  it('shows Try again when the list fails', async () => {
    vi.mocked(adminApi.fetchAdminCommissions).mockRejectedValue(new Error('boom'));
    setup();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
