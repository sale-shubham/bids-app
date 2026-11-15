import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
const verifyPayment = vi.hoisted(() => vi.fn());
const createDepositCheckout = vi.hoisted(() => vi.fn());
const setAuctionDeposit = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast }));
vi.mock('@/features/payments/payments.api', () => ({ verifyPayment }));
vi.mock('./deposits.api', () => ({ createDepositCheckout, setAuctionDeposit }));
vi.mock('@/features/auctions/auctions.api', () => ({ fetchAuction: vi.fn() }));

import { DepositCard, DepositPaidChip, needsDeposit } from './components/deposit-card';
import { SetDepositDialog, parseDepositRupees } from './components/set-deposit-dialog';
import { useDepositPayment } from './use-deposit';

const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
const stubCheckout = { orderId: 'order_d1', amountPaise: 1_000_000, currency: 'INR', keyId: 'stub', description: 'NobleBid bid deposit', prefill: {} };

beforeEach(() => {
  vi.clearAllMocks();
  createDepositCheckout.mockResolvedValue(stubCheckout);
  verifyPayment.mockResolvedValue({ referenceType: 'DEPOSIT' });
  setAuctionDeposit.mockResolvedValue({});
});

describe('needsDeposit / DepositPaidChip', () => {
  it('needs a deposit only when required and not HELD', () => {
    expect(needsDeposit({ deposit: null })).toBe(false);
    expect(needsDeposit({ deposit: { requiredPaise: 0, status: null } })).toBe(false);
    expect(needsDeposit({ deposit: { requiredPaise: 100, status: null } })).toBe(true);
    expect(needsDeposit({ deposit: { requiredPaise: 100, status: 'REFUNDED' } })).toBe(true);
    expect(needsDeposit({ deposit: { requiredPaise: 100, status: 'HELD' } })).toBe(false);
  });
  it('the chip shows only for HELD', () => {
    const { container, rerender } = render(<DepositPaidChip auction={{ deposit: { requiredPaise: 100, status: 'PENDING' } }} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<DepositPaidChip auction={{ deposit: { requiredPaise: 100, status: 'HELD' } }} />);
    expect(screen.getByText('Deposit paid')).toBeInTheDocument();
  });
});

describe('DepositCard + useDepositPayment (stub mode)', () => {
  it('pays: creates the deposit checkout, confirms test mode, verifies and toasts', async () => {
    render(<DepositCard auction={{ id: 'a1', deposit: { requiredPaise: 1_000_000, status: null } }} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: 'Pay ₹10,000 deposit' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simulate payment' }));
    await waitFor(() => expect(verifyPayment).toHaveBeenCalled());
    expect(createDepositCheckout).toHaveBeenCalledWith('a1');
    expect(verifyPayment.mock.calls[0][0]).toMatchObject({ orderId: 'order_d1', signature: 'stub' });
    expect(toast.success).toHaveBeenCalledWith('Deposit paid. You can bid now.');
  });

  it('invalidates the auction after paying', async () => {
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const w = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useDepositPayment(async () => true), { wrapper: w });
    await act(async () => {
      await result.current.pay('a1');
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['auction'] });
  });

  it('DEPOSIT_ALREADY_HELD while creating the checkout toasts the mapped copy and refreshes the auction', async () => {
    const { AxiosError } = await import('axios');
    const err = new AxiosError('x');
    err.response = { status: 409, data: { success: false, error: { code: 'DEPOSIT_ALREADY_HELD', message: 'm' } } } as never;
    createDepositCheckout.mockRejectedValue(err);
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const w = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    render(<DepositCard auction={{ id: 'a1', deposit: { requiredPaise: 1_000_000, status: null } }} />, { wrapper: w });
    await userEvent.click(screen.getByRole('button', { name: 'Pay ₹10,000 deposit' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Your deposit for this auction is already paid.'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['auction'] });
  });
});

describe('SetDepositDialog', () => {
  const auction = { id: 'a1', title: 'Brass Vase', depositPaise: null };

  it('parses rupee input to paise', () => {
    expect(parseDepositRupees('10000')).toBe(1_000_000);
    expect(parseDepositRupees('99.5')).toBe(9950);
    expect(parseDepositRupees('0')).toBeNull();
    expect(parseDepositRupees('abc')).toBeNull();
    expect(parseDepositRupees('1.234')).toBeNull();
  });

  it('saves a rupee amount as paise', async () => {
    const onClose = vi.fn();
    render(<SetDepositDialog auction={auction} onClose={onClose} />, { wrapper });
    await userEvent.type(screen.getByLabelText('Deposit (₹)'), '5000');
    await userEvent.click(screen.getByRole('button', { name: 'Save deposit' }));
    await waitFor(() => expect(setAuctionDeposit).toHaveBeenCalledWith('a1', 500_000));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('No deposit sends null', async () => {
    render(<SetDepositDialog auction={{ ...auction, depositPaise: 500_000 }} onClose={vi.fn()} />, { wrapper });
    expect(screen.getByLabelText('Deposit (₹)')).toHaveValue('5000');
    await userEvent.click(screen.getByLabelText('No deposit'));
    await userEvent.click(screen.getByRole('button', { name: 'Save deposit' }));
    await waitFor(() => expect(setAuctionDeposit).toHaveBeenCalledWith('a1', null));
  });

  it('rejects an empty or invalid amount without calling the API', async () => {
    render(<SetDepositDialog auction={auction} onClose={vi.fn()} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: 'Save deposit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Enter an amount in rupees/);
    expect(setAuctionDeposit).not.toHaveBeenCalled();
  });
});
