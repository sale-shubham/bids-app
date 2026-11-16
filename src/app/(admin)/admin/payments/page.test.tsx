import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '@/features/admin/admin.api';
import type { AdminPayment } from '@/features/admin/admin.types';
import AdminPaymentsPage from './page';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/admin/admin.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/payments',
  useSearchParams: () => new URLSearchParams('status=bogus'),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const payment = {
  id: 'p1',
  member: { id: 'm1', name: 'Sam', email: 'sam@example.com' },
  amountPaise: 5000,
  status: 'paid',
  gatewayOrderId: 'order_123',
  gatewayPaymentId: 'pay_456',
  referenceType: 'COMMISSION',
  referenceId: 'abcdef123456',
  createdAt: '2026-11-01T00:00:00Z',
} as unknown as AdminPayment;

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminPaymentsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.fetchAdminPayments).mockResolvedValue({ items: [payment], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });
});

describe('AdminPaymentsPage', () => {
  it('has a title-only header, tabs in the toolbar and copy buttons for the ids', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.queryByText(/Gateway payments/)).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Filters' })).getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Copy Order id' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Payment id' })).toBeInTheDocument();
  });

  it('ignores an unknown status in the URL', async () => {
    setup();
    await screen.findByText('Sam');
    expect(vi.mocked(adminApi.fetchAdminPayments).mock.calls[0][0]).toMatchObject({ status: 'all' });
  });

  it('shows Try again when the list fails', async () => {
    vi.mocked(adminApi.fetchAdminPayments).mockRejectedValue(new Error('boom'));
    setup();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
