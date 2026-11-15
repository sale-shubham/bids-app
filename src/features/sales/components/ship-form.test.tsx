import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SaleDTO } from '../sales.types';

const mutate = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../use-sales', () => ({ useShipSale: () => ({ mutate, isPending: false }) }));

import { ShipForm } from './ship-form';

const sale = () => ({ id: 's1', status: 'PAID', role: 'SELLER' }) as SaleDTO;

describe('ShipForm', () => {
  it('renders only for the seller of a PAID sale', () => {
    for (const s of [{ status: 'SHIPPED', role: 'SELLER' }, { status: 'PAID', role: 'BUYER' }, { status: 'AWAITING_PAYMENT', role: 'SELLER' }]) {
      const { container, unmount } = render(<ShipForm sale={{ id: 's1', ...s } as SaleDTO} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    render(<ShipForm sale={sale()} />);
    expect(screen.getByText('Mark as shipped', { selector: 'div' })).toBeInTheDocument();
  });

  it('COURIER needs a courier name', async () => {
    render(<ShipForm sale={sale()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }));
    expect(await screen.findByText('Enter the courier name')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits courier + tracking', async () => {
    render(<ShipForm sale={sale()} />);
    await userEvent.type(screen.getByRole('textbox', { name: /Courier/ }), 'DTDC');
    await userEvent.type(screen.getByLabelText('Tracking number'), 'T123');
    await userEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toEqual({ method: 'COURIER', courier: 'DTDC', trackingNo: 'T123' });
  });

  it('PICKUP hides the courier field and submits without one', async () => {
    render(<ShipForm sale={sale()} />);
    await userEvent.click(screen.getByLabelText('Pickup'));
    expect(screen.queryByRole('textbox', { name: /Courier/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).toEqual({ method: 'PICKUP' });
  });

  it('rejects a tracking number over 60 characters', async () => {
    render(<ShipForm sale={sale()} />);
    await userEvent.click(screen.getByLabelText('Pickup'));
    await userEvent.type(screen.getByLabelText('Tracking number'), 'x'.repeat(60));
    // maxLength blocks typing past 60, so assert the cap on the field itself
    expect(screen.getByLabelText('Tracking number')).toHaveAttribute('maxlength', '60');
  });
});
