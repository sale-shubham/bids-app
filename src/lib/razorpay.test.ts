import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openRazorpayCheckout, RazorpayCheckoutError, type RazorpayOptions } from './razorpay';

const input = { keyId: 'rzp_test', orderId: 'order_1', amountPaise: 5000, currency: 'INR' };
const response = { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' };

let options: RazorpayOptions;
let close: ReturnType<typeof vi.fn>;
let open: ReturnType<typeof vi.fn>;
let failedCb: ((resp: unknown) => void) | undefined;
// When true, close() fires ondismiss like the real checkout does.
let closeFiresDismiss: boolean;

beforeEach(() => {
  failedCb = undefined;
  closeFiresDismiss = true;
  open = vi.fn();
  close = vi.fn(() => {
    if (closeFiresDismiss) options.modal?.ondismiss?.();
  });
  window.Razorpay = class {
    constructor(o: RazorpayOptions) {
      options = o;
    }
    open = open;
    close = close;
    on = (_e: string, cb: (resp: unknown) => void) => {
      failedCb = cb;
    };
  } as unknown as typeof window.Razorpay;
});

afterEach(() => {
  delete window.Razorpay;
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('openRazorpayCheckout', () => {
  it('resolves with the handler response', async () => {
    const p = openRazorpayCheckout(input);
    await flush();
    options.handler(response);
    await expect(p).resolves.toEqual(response);
  });

  it('ignores a dismiss after the handler already resolved', async () => {
    const p = openRazorpayCheckout(input);
    await flush();
    options.handler(response);
    options.modal?.ondismiss?.();
    await expect(p).resolves.toEqual(response);
  });

  it('rejects with "dismissed" when the user closes the window', async () => {
    const p = openRazorpayCheckout(input);
    await flush();
    options.modal?.ondismiss?.();
    await expect(p).rejects.toMatchObject({ reason: 'dismissed' });
  });

  it('rejects with "failed" on payment.failed', async () => {
    const p = openRazorpayCheckout(input);
    await flush();
    failedCb?.({ error: { description: 'Card declined' } });
    await expect(p).rejects.toMatchObject({ reason: 'failed', message: 'Card declined' });
  });

  it('abort closes the checkout and rejects with "aborted"', async () => {
    const ac = new AbortController();
    const p = openRazorpayCheckout(input, { signal: ac.signal });
    await flush();
    ac.abort();
    await expect(p).rejects.toBeInstanceOf(RazorpayCheckoutError);
    await expect(p).rejects.toMatchObject({ reason: 'aborted' });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('abort beats the ondismiss fired by close()', async () => {
    const ac = new AbortController();
    const p = openRazorpayCheckout(input, { signal: ac.signal });
    await flush();
    ac.abort();
    await expect(p).rejects.toMatchObject({ reason: 'aborted' });
    expect(close).toHaveBeenCalled();
  });

  it('a handler response after abort is ignored', async () => {
    const ac = new AbortController();
    const p = openRazorpayCheckout(input, { signal: ac.signal });
    await flush();
    ac.abort();
    options.handler(response);
    await expect(p).rejects.toMatchObject({ reason: 'aborted' });
  });

  it('abort after settling does nothing', async () => {
    const ac = new AbortController();
    const p = openRazorpayCheckout(input, { signal: ac.signal });
    await flush();
    options.handler(response);
    await expect(p).resolves.toEqual(response);
    ac.abort();
    expect(close).not.toHaveBeenCalled();
  });

  it('an already-aborted signal rejects without opening checkout', async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(openRazorpayCheckout(input, { signal: ac.signal })).rejects.toMatchObject({ reason: 'aborted' });
    expect(open).not.toHaveBeenCalled();
  });
});
