import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as invoicesApi from '../invoices.api';
import { InvoicesCard } from './invoices-card';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../invoices.api');

const setup = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InvoicesCard />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(invoicesApi.fetchMyInvoices).mockResolvedValue({
    items: [
      { id: 'i1', number: 'NB/2026/0001', type: 'COMMISSION', totalPaise: 59000, isTaxInvoice: true, issuedAt: '2026-11-01T00:00:00Z' },
      { id: 'i2', number: 'NB/2026/0002', type: 'FEATURE', totalPaise: 24900, isTaxInvoice: false, issuedAt: '2026-11-02T00:00:00Z' },
    ],
    meta: { total: 2, page: 1, pageSize: 20, totalPages: 1 },
  });
});

describe('InvoicesCard', () => {
  it('lists invoices with type, amount and tax/receipt badge', async () => {
    setup();
    expect(await screen.findByText('NB/2026/0001')).toBeInTheDocument();
    expect(screen.getByText('Commission')).toBeInTheDocument();
    expect(screen.getByText('Promotion')).toBeInTheDocument();
    expect(screen.getByText('Tax invoice')).toBeInTheDocument();
    expect(screen.getByText('Receipt')).toBeInTheDocument();
    expect(screen.getByText('₹590')).toBeInTheDocument();
  });

  it('Download fetches the PDF link and opens it in a new tab', async () => {
    vi.mocked(invoicesApi.fetchInvoicePdfUrl).mockResolvedValue('https://files.example.com/inv.pdf');
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Download NB/2026/0002' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://files.example.com/inv.pdf', '_blank', 'noopener,noreferrer'));
    expect(invoicesApi.fetchInvoicePdfUrl).toHaveBeenCalledWith('i2');
    open.mockRestore();
  });
});
