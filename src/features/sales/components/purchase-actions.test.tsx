import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaleDTO } from '../sales.types';

const m = vi.hoisted(() => ({
  pay: vi.fn(),
  confirmMutate: vi.fn(),
  disputeMutate: vi.fn(),
  payingId: null as string | null,
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../use-sales', () => ({
  useSalePayment: () => ({ pay: m.pay, payingId: m.payingId }),
  useConfirmSale: () => ({ mutate: m.confirmMutate, isPending: false }),
  useDisputeSale: () => ({ mutate: m.disputeMutate, isPending: false }),
}));

import { PurchaseActions } from './purchase-actions';
import { SaleStatusBadge } from './sale-status-badge';

const FUTURE = new Date(Date.now() + 3 * 86_400_000).toISOString();
const sale = (over: Partial<SaleDTO> = {}): SaleDTO => ({
  id: 's1',
  auctionId: 'a1',
  auction: { id: 'a1', title: 'Brass Vase', coverImage: null },
  status: 'AWAITING_PAYMENT',
  itemPaise: 250000,
  shippingFeePaise: 0,
  amountPaise: 250000,
  payBy: FUTURE,
  paidAt: null,
  shippingMethod: null,
  courier: null,
  trackingNo: null,
  shippedAt: null,
  deliveredAt: null,
  releasedAt: null,
  disputedAt: null,
  disputeReason: null,
  refundedAt: null,
  cancelledAt: null,
  createdAt: new Date().toISOString(),
  role: 'BUYER',
  buyer: { id: 'b', name: 'Bea' },
  seller: { id: 'u', name: 'Sam' },
  ...over,
});

beforeEach(() => {
  m.payingId = null;
});

describe('PurchaseActions by status', () => {
  it('AWAITING_PAYMENT: Pay button with the amount; clicking pays this sale', async () => {
    render(<PurchaseActions sale={sale()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Pay ₹2,500' }));
    expect(m.pay).toHaveBeenCalledWith('s1');
    expect(screen.queryByRole('button', { name: /Confirm received/ })).not.toBeInTheDocument();
  });

  it('AWAITING_PAYMENT after payBy: no Pay button, window closed message', () => {
    render(<PurchaseActions sale={sale({ payBy: new Date(Date.now() - 1000).toISOString() })} />);
    expect(screen.queryByRole('button', { name: /^Pay/ })).not.toBeInTheDocument();
    expect(screen.getByText(/payment window .* has closed/i)).toBeInTheDocument();
  });

  it('Pay is disabled while another payment is running', () => {
    m.payingId = 's9';
    render(<PurchaseActions sale={sale()} />);
    expect(screen.getByRole('button', { name: 'Pay ₹2,500' })).toBeDisabled();
  });

  it.each(['PAID', 'SHIPPED'] as const)('%s: Confirm received and Report a problem', (status) => {
    render(<PurchaseActions sale={sale({ status })} />);
    expect(screen.getByRole('button', { name: 'Confirm received' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report a problem' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay/ })).not.toBeInTheDocument();
  });

  it('DELIVERED: only Report a problem', () => {
    render(<PurchaseActions sale={sale({ status: 'DELIVERED' })} />);
    expect(screen.queryByRole('button', { name: 'Confirm received' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report a problem' })).toBeInTheDocument();
  });

  it.each(['RELEASED', 'REFUNDED', 'CANCELLED', 'DISPUTED'] as const)('%s: no actions', (status) => {
    const { container } = render(<PurchaseActions sale={sale({ status })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('seller / admin views get no buyer actions', () => {
    const { container, rerender } = render(<PurchaseActions sale={sale({ role: 'SELLER', status: 'PAID' })} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PurchaseActions sale={sale({ role: 'ADMIN', status: 'PAID' })} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Confirm received dialog', () => {
  it('asks first ("releases the payment to the seller") and only then calls the API', async () => {
    render(<PurchaseActions sale={sale({ status: 'SHIPPED' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm received' }));
    expect(screen.getByText('This releases the payment to the seller.')).toBeInTheDocument();
    expect(m.confirmMutate).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(screen.getAllByRole('button', { name: 'Confirm received' }).at(-1)!);
    expect(dialog).toBeDefined();
    expect(m.confirmMutate).toHaveBeenCalledTimes(1);
  });

  it('Cancel closes without calling the API', async () => {
    render(<PurchaseActions sale={sale({ status: 'PAID' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm received' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(m.confirmMutate).not.toHaveBeenCalled();
  });
});

describe('Report a problem dialog', () => {
  it('rejects a reason under 10 characters and does not call the API', async () => {
    render(<PurchaseActions sale={sale({ status: 'PAID' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    await userEvent.type(screen.getByLabelText('What went wrong?'), 'broken');
    await userEvent.click(screen.getByRole('button', { name: 'Report problem' }));
    expect(await screen.findByText(/at least 10 characters/)).toBeInTheDocument();
    expect(m.disputeMutate).not.toHaveBeenCalled();
  });

  it('submits a valid reason (trimmed)', async () => {
    render(<PurchaseActions sale={sale({ status: 'PAID' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    await userEvent.type(screen.getByLabelText('What went wrong?'), '  The vase arrived cracked  ');
    await userEvent.click(screen.getByRole('button', { name: 'Report problem' }));
    await waitFor(() => expect(m.disputeMutate).toHaveBeenCalled());
    expect(m.disputeMutate.mock.calls[0][0]).toBe('The vase arrived cracked');
  });
});

describe('SaleStatusBadge', () => {
  it.each([
    ['AWAITING_PAYMENT', 'Awaiting payment'],
    ['PAID', 'Paid'],
    ['SHIPPED', 'Shipped'],
    ['DELIVERED', 'Delivered'],
    ['RELEASED', 'Completed'],
    ['DISPUTED', 'Disputed'],
    ['REFUNDED', 'Refunded'],
    ['CANCELLED', 'Cancelled'],
    ['SOMETHING_NEW', 'SOMETHING_NEW'],
  ])('%s -> %s', (status, label) => {
    render(<SaleStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
