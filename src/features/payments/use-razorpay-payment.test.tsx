import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
const verifyPayment = vi.hoisted(() => vi.fn());
const openRazorpayCheckout = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast }));
vi.mock('./payments.api', () => ({ verifyPayment }));
vi.mock('@/lib/razorpay', async (orig) => ({ ...(await orig<typeof import('@/lib/razorpay')>()), openRazorpayCheckout }));

import { useRazorpayPayment, type RazorpayPaymentConfig } from './use-razorpay-payment';

const stubCheckout = { orderId: 'order_s1', amountPaise: 250000, currency: 'INR', keyId: 'stub', description: 'Sale', prefill: {} };

function setup(over: Partial<RazorpayPaymentConfig> = {}) {
  const qc = new QueryClient();
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const config: RazorpayPaymentConfig = {
    createCheckout: vi.fn().mockResolvedValue(stubCheckout),
    invalidateKeys: [['sales'], ['me']],
    confirmStub: vi.fn().mockResolvedValue(true),
    successMessage: 'Paid!',
    errorMessage: (e) => (e instanceof Error ? `mapped: ${e.message}` : 'unknown'),
    ...over,
  };
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  const hook = renderHook(() => useRazorpayPayment(config), { wrapper });
  return { ...hook, config, invalidate };
}

beforeEach(() => {
  verifyPayment.mockResolvedValue({ referenceType: 'SALE', sale: {} });
});

describe('useRazorpayPayment (sale checkout, stub mode)', () => {
  it('creates the checkout for the given id, confirms the stub, verifies with stub values and invalidates every key', async () => {
    const { result, config, invalidate } = setup();
    let ok = false;
    await act(async () => {
      ok = await result.current.pay('sale1');
    });
    expect(ok).toBe(true);
    expect(config.createCheckout).toHaveBeenCalledWith('sale1');
    expect(config.confirmStub).toHaveBeenCalled();
    expect(openRazorpayCheckout).not.toHaveBeenCalled();
    expect(verifyPayment).toHaveBeenCalledWith(
      { orderId: 'order_s1', paymentId: expect.stringMatching(/^stub_pay_\d+$/), signature: 'stub' },
      { timeoutMs: 20_000 },
    );
    expect(toast.success).toHaveBeenCalledWith('Paid!');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sales'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(result.current.payingId).toBeNull();
  });

  it('declining the stub dialog cancels without verifying', async () => {
    const { result } = setup({ confirmStub: vi.fn().mockResolvedValue(false) });
    let ok = true;
    await act(async () => {
      ok = await result.current.pay('sale1');
    });
    expect(ok).toBe(false);
    expect(verifyPayment).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Payment cancelled');
  });

  it('checkout failure: toasts the mapped message and calls onCheckoutError', async () => {
    const onCheckoutError = vi.fn();
    const { result } = setup({ createCheckout: vi.fn().mockRejectedValue(new Error('SALE_NOT_PAYABLE')), onCheckoutError });
    let ok = true;
    await act(async () => {
      ok = await result.current.pay('sale1');
    });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('mapped: SALE_NOT_PAYABLE');
    expect(onCheckoutError).toHaveBeenCalled();
    expect(result.current.payingId).toBeNull();
  });

  it('blocks a second payment while one is running', async () => {
    let release!: (v: boolean) => void;
    const confirmStub = vi.fn(() => new Promise<boolean>((r) => (release = r)));
    const { result, config } = setup({ confirmStub });
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.pay('sale1');
    });
    await act(async () => {});
    expect(result.current.payingId).toBe('sale1');
    let second = true;
    await act(async () => {
      second = await result.current.pay('sale2');
    });
    expect(second).toBe(false);
    expect(config.createCheckout).toHaveBeenCalledTimes(1);
    await act(async () => {
      release(true);
      await first;
    });
  });
});
