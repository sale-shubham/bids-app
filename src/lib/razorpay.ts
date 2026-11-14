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
    public reason: 'dismissed' | 'failed' | 'load',
    message: string,
  ) {
    super(message);
  }
}

/** Opens Checkout in order mode. Resolves with the signed response; rejects with RazorpayCheckoutError. */
export async function openRazorpayCheckout(input: OpenCheckoutInput): Promise<RazorpayHandlerResponse> {
  const ok = await loadRazorpayCheckout();
  if (!ok || !window.Razorpay) throw new RazorpayCheckoutError('load', 'Could not load the payment window.');
  const Ctor = window.Razorpay;
  return new Promise<RazorpayHandlerResponse>((resolve, reject) => {
    const rzp = new Ctor({
      key: input.keyId,
      order_id: input.orderId,
      amount: input.amountPaise,
      currency: input.currency,
      name: 'NobleBid',
      description: input.description,
      prefill: input.prefill,
      theme: { color: '#7C3AED' },
      modal: { ondismiss: () => reject(new RazorpayCheckoutError('dismissed', 'Payment cancelled')) },
      handler: resolve,
    });
    rzp.on('payment.failed', (resp) => {
      const desc = (resp as { error?: { description?: string } })?.error?.description;
      reject(new RazorpayCheckoutError('failed', desc || 'Payment failed'));
    });
    rzp.open();
  });
}
