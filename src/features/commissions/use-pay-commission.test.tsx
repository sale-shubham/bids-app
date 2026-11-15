import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }));
const api = vi.hoisted(() => ({
  createCommissionCheckout: vi.fn(),
  fetchCommission: vi.fn(),
  payCommissionWithCredits: vi.fn(),
  verifyPayment: vi.fn(),
}));

vi.mock('sonner', () => ({ toast }));
vi.mock('./commissions.api', () => ({
  createCommissionCheckout: api.createCommissionCheckout,
  fetchCommission: api.fetchCommission,
  payCommissionWithCredits: api.payCommissionWithCredits,
}));
vi.mock('@/features/payments/payments.api', () => ({ verifyPayment: api.verifyPayment }));

import { usePayCommission } from './use-pay-commission';
import type { RazorpayOptions } from '@/lib/razorpay';

const checkoutPayload = {
  orderId: 'order_1',
  amountPaise: 5000,
  currency: 'INR',
  keyId: 'rzp_test',
  description: 'Commission',
  prefill: {},
};
const rzpResponse = { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' };

let options: RazorpayOptions | undefined;
let close: ReturnType<typeof vi.fn>;

function setup() {
  const qc = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePayCommission(async () => true), { wrapper });
}

beforeEach(() => {
  vi.useFakeTimers();
  options = undefined;
  close = vi.fn(() => options?.modal?.ondismiss?.());
  window.Razorpay = class {
    constructor(o: RazorpayOptions) {
      options = o;
    }
    open = vi.fn();
    close = close;
    on = vi.fn();
  } as unknown as typeof window.Razorpay;
  api.createCommissionCheckout.mockResolvedValue(checkoutPayload);
  api.fetchCommission.mockResolvedValue({ id: 'c1', status: 'DUE' });
  api.verifyPayment.mockResolvedValue({ commission: {} });
});

afterEach(() => {
  vi.useRealTimers();
  delete window.Razorpay;
});

// Lets pending promise chains (checkout, script check) run without advancing timers.
const settleMicrotasks = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

describe('usePayCommission (Razorpay)', () => {
  it('happy path: handler fires, verify succeeds', async () => {
    const { result } = setup();
    let p!: Promise<boolean>;
    act(() => { p = result.current.pay('c1'); });
    await settleMicrotasks();
    expect(result.current.payingId).toBe('c1');
    await act(async () => { options!.handler(rzpResponse); });
    await expect(p).resolves.toBe(true);
    expect(api.verifyPayment).toHaveBeenCalledWith(
      { orderId: 'order_1', paymentId: 'pay_1', signature: 'sig' },
      { timeoutMs: 20_000 },
    );
    expect(toast.success).toHaveBeenCalledWith('Payment successful. Commission paid.');
    expect(result.current.payingId).toBeNull();
  });

  it('handler never fires but the watcher sees PAID: resolves true and clears payingId', async () => {
    const { result } = setup();
    let p!: Promise<boolean>;
    act(() => { p = result.current.pay('c1'); });
    await settleMicrotasks();
    api.fetchCommission.mockResolvedValue({ id: 'c1', status: 'PAID' });
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await expect(p).resolves.toBe(true);
  });

  it('verify fails but the commission is already PAID: resolves true', async () => {
    api.verifyPayment.mockRejectedValue(new Error('timeout of 20000ms exceeded'));
    api.fetchCommission.mockResolvedValue({ id: 'c1', status: 'PAID' });
    const { result } = setup();
    let p!: Promise<boolean>;
    act(() => { p = result.current.pay('c1'); });
    await settleMicrotasks();
    await act(async () => { options!.handler(rzpResponse); });
    await expect(p).resolves.toBe(true);
    expect(toast.success).toHaveBeenCalledWith('Payment successful. Commission paid.');
    expect(toast.info).not.toHaveBeenCalled();
    expect(result.current.payingId).toBeNull();
  });

  it('verify fails and the commission is still DUE: info toast, resolves false', async () => {
    api.verifyPayment.mockRejectedValue(new Error('boom'));
    const { result } = setup();
    let p!: Promise<boolean>;
    act(() => { p = result.current.pay('c1'); });
    await settleMicrotasks();
    await act(async () => { options!.handler(rzpResponse); });
    await expect(p).resolves.toBe(false);
    expect(toast.info).toHaveBeenCalled();
    expect(result.current.payingId).toBeNull();
  });

  it('stops polling once pay() has finished', async () => {
    const { result } = setup();
    let p!: Promise<boolean>;
    act(() => { p = result.current.pay('c1'); });
    await settleMicrotasks();
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(api.fetchCommission).toHaveBeenCalledTimes(1);
    await act(async () => { options!.handler(rzpResponse); });
    await p;
    api.fetchCommission.mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
      window.dispatchEvent(new Event('focus'));
    });
    expect(api.fetchCommission).not.toHaveBeenCalled();
  });

  it('stops polling after 20 minutes', async () => {
    const { result } = setup();
    act(() => { void result.current.pay('c1'); });
    await settleMicrotasks();
    await act(async () => { await vi.advanceTimersByTimeAsync(20 * 60 * 1000 + 4000); });
    api.fetchCommission.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(api.fetchCommission).not.toHaveBeenCalled();
  });
});
