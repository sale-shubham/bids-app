import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SaleDTO } from '../sales.types';

const m = vi.hoisted(() => ({ release: vi.fn(), refund: vi.fn() }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/features/admin/use-admin', () => ({
  useReleaseSale: () => ({ mutate: m.release, isPending: false }),
  useRefundSale: () => ({ mutate: m.refund, isPending: false }),
}));

import { AdminSaleActions } from './admin-sale-actions';

const sale = (status: string): SaleDTO =>
  ({
    id: 's1',
    status,
    role: 'ADMIN',
    amountPaise: 250000,
    payoutPaise: 237500,
    auction: { id: 'a1', title: 'Brass Vase' },
    buyer: { id: 'b', name: 'Bea' },
    seller: { id: 'u', name: 'Sam' },
  }) as SaleDTO;

describe('AdminSaleActions', () => {
  it('no actions for settled sales', () => {
    for (const s of ['AWAITING_PAYMENT', 'RELEASED', 'REFUNDED', 'CANCELLED']) {
      const { container, unmount } = render(<AdminSaleActions sale={sale(s)} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('Release asks for confirmation, then releases', async () => {
    render(<AdminSaleActions sale={sale('DISPUTED')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Release' }));
    expect(screen.getByText(/will be paid out to Sam/)).toBeInTheDocument();
    expect(m.release).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Release payment' }));
    expect(m.release.mock.calls[0][0]).toBe('s1');
  });

  it('Refund sends the optional note (trimmed), or none', async () => {
    render(<AdminSaleActions sale={sale('PAID')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));
    await userEvent.type(screen.getByLabelText('Note (optional)'), '  item lost  ');
    await userEvent.click(screen.getByRole('button', { name: 'Refund buyer' }));
    await waitFor(() => expect(m.refund).toHaveBeenCalled());
    expect(m.refund.mock.calls[0][0]).toEqual({ id: 's1', note: 'item lost' });
  });

  it('Refund without a note omits it', async () => {
    render(<AdminSaleActions sale={sale('SHIPPED')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));
    await userEvent.click(screen.getByRole('button', { name: 'Refund buyer' }));
    expect(m.refund.mock.calls[0][0]).toEqual({ id: 's1', note: undefined });
  });

  it('Cancel on the dialog does nothing', async () => {
    render(<AdminSaleActions sale={sale('PAID')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Refund' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(m.refund).not.toHaveBeenCalled();
  });
});
