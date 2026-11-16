import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as pdf from '@/lib/pdf';
import * as invoicesApi from '@/features/invoices/invoices.api';
import type { AdminInvoice } from '@/features/invoices/invoices.types';
import AdminInvoicesPage from './page';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/features/invoices/invoices.api');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/invoices',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/use-is-narrow-content', () => ({ useIsNarrowContent: () => false }));

const invoice = {
  id: 'i1',
  number: 'NB/2026/0001',
  type: 'COMMISSION',
  totalPaise: 59000,
  isTaxInvoice: true,
  issuedAt: '2026-11-01T00:00:00Z',
  memberId: 'member-123456',
  buyerName: 'Sam Seller',
  buyerGstin: null,
} as unknown as AdminInvoice;

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminInvoicesPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(invoicesApi.fetchAdminInvoices).mockResolvedValue({ items: [invoice], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } });
});

describe('AdminInvoicesPage', () => {
  it('renders a title with no description and a Type filter in the Filters panel', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Invoices' })).toBeInTheDocument();
    expect(screen.queryByText(/GST invoices and receipts issued/)).not.toBeInTheDocument();
    await screen.findByText('NB/2026/0001');
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Type' }));
    expect(await screen.findByRole('option', { name: 'Promotion' })).toBeInTheDocument();
  });

  it('Download opens the tab first, then shows the fetched PDF in it', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    vi.mocked(invoicesApi.fetchInvoicePdf).mockResolvedValue(blob);
    const tab = { document: { title: '', body: { textContent: '' } }, location: { href: '' }, close: vi.fn() } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(tab);
    const show = vi.spyOn(pdf, 'showPdf').mockImplementation(() => undefined);
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Download NB/2026/0001' }));
    expect(open).toHaveBeenCalledWith('', '_blank');
    await waitFor(() => expect(show).toHaveBeenCalledWith(blob, tab, 'NB-2026-0001.pdf'));
    expect(invoicesApi.fetchInvoicePdf).toHaveBeenCalledWith('i1');
    open.mockRestore();
    show.mockRestore();
  });

  it('shows Try again when the list fails', async () => {
    vi.mocked(invoicesApi.fetchAdminInvoices).mockRejectedValue(new Error('boom'));
    setup();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
