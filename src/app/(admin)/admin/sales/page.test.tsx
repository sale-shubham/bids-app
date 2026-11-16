import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '@/features/admin/admin.api';
import type { SaleDTO } from '@/features/sales/sales.types';
import AdminSalesPage from './page';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/admin/admin.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/sales',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const sale = (status: string): SaleDTO =>
  ({
    id: 's1',
    status,
    role: 'ADMIN',
    amountPaise: 250000,
    payoutPaise: 237500,
    paidAt: '2026-11-01T00:00:00Z',
    auction: { id: 'a1', title: 'Brass Vase' },
    buyer: { id: 'b', name: 'Bea' },
    seller: { id: 'u', name: 'Sam' },
  }) as SaleDTO;
const page = (s: SaleDTO) => ({ items: [s], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminSalesPage />
    </QueryClientProvider>,
  );
}
const openMenu = async () => userEvent.click(await screen.findByRole('button', { name: 'Actions for Brass Vase' }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminApi.fetchAdminSales).mockResolvedValue(page(sale('DISPUTED')));
  vi.mocked(adminApi.releaseSale).mockResolvedValue({} as never);
  vi.mocked(adminApi.refundSale).mockResolvedValue({} as never);
});

describe('AdminSalesPage', () => {
  it('renders a title with no description, tabs and the filters toolbar', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.queryByText(/Winner payments/)).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Awaiting payment' })).toBeInTheDocument();
  });

  it('offers the statuses without a tab in the Filters panel', async () => {
    setup();
    await screen.findByText('Brass Vase');
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Other status' }));
    for (const n of ['Delivered', 'Refunded', 'Cancelled']) expect(await screen.findByRole('option', { name: n })).toBeInTheDocument();
  });

  it('has no row menu for settled sales', async () => {
    vi.mocked(adminApi.fetchAdminSales).mockResolvedValue(page(sale('RELEASED')));
    setup();
    await screen.findByText('Brass Vase');
    expect(screen.queryByRole('button', { name: 'Actions for Brass Vase' })).not.toBeInTheDocument();
  });

  it('Release is offered for a disputed sale, asks to confirm, then releases', async () => {
    setup();
    await openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Release' }));
    expect(adminApi.releaseSale).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/will be paid out to Sam/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Release payment' }));
    await waitFor(() => expect(adminApi.releaseSale).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Payment released to the seller'));
  });

  it('Release is not offered for a paid sale; Refund sends the trimmed note', async () => {
    vi.mocked(adminApi.fetchAdminSales).mockResolvedValue(page(sale('PAID')));
    setup();
    await openMenu();
    expect(screen.queryByRole('menuitem', { name: 'Release' })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Refund' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Note (optional)'), '  item lost  ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Refund buyer' }));
    await waitFor(() => expect(adminApi.refundSale).toHaveBeenCalledWith('s1', 'item lost'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Payment refunded to the buyer'));
  });

  it('shows Try again when the list fails', async () => {
    vi.mocked(adminApi.fetchAdminSales).mockRejectedValue(new Error('boom'));
    setup();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
