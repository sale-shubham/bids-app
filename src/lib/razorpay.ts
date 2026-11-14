// Razorpay Checkout loader. The hosted checkout.js script is injected once and
// cached — there is no npm SDK for the browser side. `window.Razorpay` is opened
// in ORDER mode with a server-created order id; the `handler` callback hands back
// the payment id + order id + signature we POST to /payments/verify.

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  order_id: string;
  amount?: number;
  currency?: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpayHandlerResponse) => void;
}

export interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, cb: (resp: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let loader: Promise<boolean> | null = null;

// Returns a cached promise so concurrent buys reuse one script tag.
export function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loader) return loader;

  loader = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => { loader = null; resolve(false); });
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => { loader = null; resolve(false); };
    document.body.appendChild(script);
  });
  return loader;
}

export interface OpenCheckoutInput {
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

export class RazorpayCheckoutError extends Error {
  constructor(
    public reason: 'dismissed' | 'failed' | 'load' | 'aborted',
    message: string,
  ) {
    super(message);
  }
}

const abortedError = () => new RazorpayCheckoutError('aborted', 'Payment window closed.');

/**
 * Opens Checkout in order mode. Resolves with the signed response; rejects with RazorpayCheckoutError.
 * If `opts.signal` aborts, the checkout is closed and the promise rejects with reason 'aborted'
 * (the caller uses this when it learned the payment went through some other way).
 */
export async function openRazorpayCheckout(
  input: OpenCheckoutInput,
  opts: { signal?: AbortSignal } = {},
): Promise<RazorpayHandlerResponse> {
  const { signal } = opts;
  if (signal?.aborted) throw abortedError();
  const ok = await loadRazorpayCheckout();
  if (signal?.aborted) throw abortedError();
  if (!ok || !window.Razorpay) throw new RazorpayCheckoutError('load', 'Could not load the payment window.');
  const Ctor = window.Razorpay;
  return new Promise<RazorpayHandlerResponse>((resolve, reject) => {
    // The handler, ondismiss, payment.failed and abort can race (rzp.close() itself fires
    // ondismiss). Whichever comes first settles the promise; everything after is ignored.
    let settled = false;
    let rzp: RazorpayInstance | null = null;
    const onAbort = () => {
      // Settle before closing so the ondismiss that close() triggers is ignored.
      if (!settle(() => reject(abortedError()))) return;
      try {
        rzp?.close();
      } catch {
        // already closed
      }
    };
    const settle = (fn: () => void): boolean => {
      if (settled) return false;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      fn();
      return true;
    };

    rzp = new Ctor({
      key: input.keyId,
      order_id: input.orderId,
      amount: input.amountPaise,
      currency: input.currency,
      name: 'NobleBid',
      description: input.description,
      prefill: input.prefill,
      theme: { color: '#7C3AED' },
      modal: { ondismiss: () => settle(() => reject(new RazorpayCheckoutError('dismissed', 'Payment cancelled'))) },
      handler: (response) => settle(() => resolve(response)),
    });
    rzp.on('payment.failed', (resp) => {
      const desc = (resp as { error?: { description?: string } })?.error?.description;
      settle(() => reject(new RazorpayCheckoutError('failed', desc || 'Payment failed')));
    });
    signal?.addEventListener('abort', onAbort);
    rzp.open();
  });
}
