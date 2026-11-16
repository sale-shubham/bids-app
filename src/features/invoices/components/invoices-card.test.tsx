import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import * as pdf from '@/lib/pdf';
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

  it('Download opens the tab first, shows the fetched PDF in it and names the file after the invoice', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    vi.mocked(invoicesApi.fetchInvoicePdf).mockResolvedValue(blob);
    const tab = { document: { title: '', body: { textContent: '' } }, location: { href: '' }, close: vi.fn() } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(tab);
    const show = vi.spyOn(pdf, 'showPdf').mockImplementation(() => undefined);
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Download NB/2026/0002' }));
    expect(open).toHaveBeenCalledWith('', '_blank');
    await waitFor(() => expect(show).toHaveBeenCalledWith(blob, tab, 'NB-2026-0002.pdf'));
    expect(invoicesApi.fetchInvoicePdf).toHaveBeenCalledWith('i2');
    open.mockRestore();
    show.mockRestore();
  });

  it('shows Preparing... while loading', async () => {
    let resolve!: (b: Blob) => void;
    vi.mocked(invoicesApi.fetchInvoicePdf).mockReturnValue(new Promise<Blob>((r) => (resolve = r)));
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const show = vi.spyOn(pdf, 'showPdf').mockImplementation(() => undefined);
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Download NB/2026/0001' }));
    expect(await screen.findByText('Preparing…')).toBeInTheDocument();
    resolve(new Blob(['%PDF']));
    await waitFor(() => expect(screen.queryByText('Preparing…')).not.toBeInTheDocument());
    open.mockRestore();
    show.mockRestore();
  });

  it('on failure closes the pre-opened tab and toasts the mapped message', async () => {
    const err = Object.assign(new Error('nf'), { isAxiosError: true, response: { status: 404, data: { success: false, error: { code: 'INVOICE_NOT_FOUND', message: 'nope' } } } });
    vi.mocked(invoicesApi.fetchInvoicePdf).mockRejectedValue(err);
    const tab = { document: { title: '', body: { textContent: '' } }, close: vi.fn() } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(tab);
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Download NB/2026/0001' }));
    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This invoice could not be found.'));
    open.mockRestore();
  });
});
