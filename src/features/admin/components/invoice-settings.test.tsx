import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InvoiceSettings as Data } from '@/features/invoices/invoices.types';

const m = vi.hoisted(() => ({ mutate: vi.fn(), data: undefined as unknown }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/features/invoices/use-invoices', () => ({
  useInvoiceSettings: () => ({ data: m.data, isLoading: false, error: null, refetch: vi.fn() }),
  useSaveInvoiceSettings: () => ({ mutate: m.mutate, isPending: false }),
}));

import { InvoiceSettings } from './invoice-settings';

const settings: Data = {
  legalName: 'NobleBid Pvt Ltd',
  gstin: '29ABCDE1234F1Z5',
  address: '12 MG Road, Bengaluru',
  stateCode: '29',
  gstRateBps: 1800,
  commissionInclusive: false,
  sacCode: '998599',
};

beforeEach(() => {
  vi.clearAllMocks();
  m.data = settings;
});

describe('InvoiceSettings form', () => {
  it('shows the stored values (rate as a percentage)', () => {
    render(<InvoiceSettings />);
    expect(screen.getByLabelText('Legal name')).toHaveValue('NobleBid Pvt Ltd');
    expect(screen.getByLabelText('GST rate (%)')).toHaveValue('18.00');
    expect(screen.getByLabelText('State')).toHaveTextContent('Karnataka (29)');
  });

  it('saves edited values with the rate converted to basis points and the inclusive switch', async () => {
    render(<InvoiceSettings />);
    const rate = screen.getByLabelText('GST rate (%)');
    await userEvent.clear(rate);
    await userEvent.type(rate, '12.5');
    await userEvent.click(screen.getByRole('switch'));
    await userEvent.click(screen.getByRole('button', { name: 'Save invoice details' }));
    await waitFor(() => expect(m.mutate).toHaveBeenCalled());
    expect(m.mutate.mock.calls[0][0]).toEqual({ ...settings, gstRateBps: 1250, commissionInclusive: true });
  });

  it('rejects a GSTIN that does not match the state code', async () => {
    render(<InvoiceSettings />);
    const gstin = screen.getByLabelText('GSTIN');
    await userEvent.clear(gstin);
    await userEvent.type(gstin, '27ABCDE1234F1Z5');
    await userEvent.click(screen.getByRole('button', { name: 'Save invoice details' }));
    expect(await screen.findByText(/must match the state code/)).toBeInTheDocument();
    expect(m.mutate).not.toHaveBeenCalled();
  });
});
