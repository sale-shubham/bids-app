'use client';
import * as React from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { openRazorpayCheckout, RazorpayCheckoutError } from '@/lib/razorpay';
import { verifyPayment } from './payments.api';
import type { CheckoutPayload } from './payments.types';

const VERIFY_TIMEOUT_MS = 20_000;
const WATCH_INTERVAL_MS = 4_000;
const WATCH_MAX_MS = 20 * 60 * 1000;

export interface RazorpayPaymentConfig {
  /** Creates the Razorpay order for the thing being paid (`id` is whatever `pay(id)` got). */
  createCheckout: (id: string) => Promise<CheckoutPayload>;
  /** Server-side "has this been settled?" check. Enables the paid-by-webhook watcher and the post-verify fallback. */
  isAlreadyPaid?: (id: string) => Promise<boolean>;
  /** Query keys to invalidate after a payment (or a refresh). */
  invalidateKeys: readonly QueryKey[];
  /** Page-supplied dialog so test mode (`keyId === 'stub'`) never loads checkout.js. */
  confirmStub: () => Promise<boolean>;
  successMessage?: string;
  /** Maps a checkout-creation / verify error to toast copy. */
  errorMessage: (err: unknown) => string;
  /** Called when creating the checkout fails (e.g. to refresh stale lists). */
  onCheckoutError?: (err: unknown) => void;
}

/**
 * Generic payment flow: checkout -> Razorpay (or stub confirm) -> verify -> invalidate.
 * `pay(id)` resolves true once verified. `payingId` blocks double clicks.
 * Used by `usePayCommission` and `useSalePayment`.
 */
export function useRazorpayPayment(config: RazorpayPaymentConfig) {
  const qc = useQueryClient();
  const [payingId, setPayingId] = React.useState<string | null>(null);
  const busy = React.useRef(false);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopWatcher = React.useRef<(() => void) | null>(null);
  // Latest config without re-creating `pay` on every render (callers pass fresh closures).
  const cfg = React.useRef(config);
  React.useEffect(() => {
    cfg.current = config;
  });

  React.useEffect(() => {
    const t = timers.current;
    return () => {
      t.forEach(clearTimeout);
      stopWatcher.current?.();
    };
  }, []);

  const refresh = React.useCallback(() => {
    for (const queryKey of cfg.current.invalidateKeys) void qc.invalidateQueries({ queryKey });
  }, [qc]);

  // While Razorpay Checkout is open, watch the order on the server. If the browser callback
  // never fires (blocked popup, closed tab, flaky handler) the webhook still marks it paid, and
  // we notice that here and abort the checkout. Polls every 4 s, and right away when the tab
  // regains focus or becomes visible; gives up after 20 minutes. Fetch errors are ignored.
  const startWatcher = React.useCallback((id: string, check: (id: string) => Promise<boolean>, onPaid: () => void) => {
    const started = Date.now();
    let stopped = false;
    let checking = false;
    const run = async () => {
      if (stopped || checking) return;
      if (Date.now() - started > WATCH_MAX_MS) return stop();
      checking = true;
      try {
        if ((await check(id)) && !stopped) onPaid();
      } catch {
        // transient; the next tick tries again
      } finally {
        checking = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void run();
    };
    const interval = setInterval(() => void run(), WATCH_INTERVAL_MS);
    const stop = () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisibility);
    return stop;
  }, []);

  const pay = React.useCallback(
    async (id: string) => {
      if (busy.current) return false;
      busy.current = true;
      setPayingId(id);
      const c = cfg.current;
      let paidButUnconfirmed = false;
      let seenPaid = false;
      const watchAbort = new AbortController();
      const stopOwnWatcher = () => {
        stopWatcher.current?.();
        stopWatcher.current = null;
      };
      const paidSuccess = () => {
        toast.success(c.successMessage ?? 'Payment successful.');
        refresh();
        return true;
      };
      try {
        let co: CheckoutPayload;
        try {
          co = await c.createCheckout(id);
        } catch (e) {
          c.onCheckoutError?.(e);
          throw e;
        }
        let verifyInput: { orderId: string; paymentId: string; signature: string };
        if (co.keyId === 'stub') {
          if (!(await c.confirmStub())) {
            toast('Payment cancelled');
            return false;
          }
          verifyInput = { orderId: co.orderId, paymentId: 'stub_pay_' + Date.now(), signature: 'stub' };
        } else {
          if (c.isAlreadyPaid) {
            stopWatcher.current = startWatcher(id, c.isAlreadyPaid, () => {
              seenPaid = true;
              watchAbort.abort();
            });
          }
          const r = await openRazorpayCheckout(
            {
              keyId: co.keyId,
              orderId: co.orderId,
              amountPaise: co.amountPaise,
              currency: co.currency,
              description: co.description,
              prefill: co.prefill,
            },
            { signal: watchAbort.signal },
          );
          stopOwnWatcher();
          paidButUnconfirmed = true;
          verifyInput = {
            orderId: r.razorpay_order_id,
            paymentId: r.razorpay_payment_id,
            signature: r.razorpay_signature,
          };
        }
        await verifyPayment(verifyInput, { timeoutMs: VERIFY_TIMEOUT_MS });
        paidButUnconfirmed = false;
        return paidSuccess();
      } catch (err) {
        if (err instanceof RazorpayCheckoutError) {
          if (err.reason === 'aborted') {
            if (seenPaid) return paidSuccess();
          } else if (err.reason === 'dismissed') toast('Payment cancelled');
          else toast.error(err.message);
        } else if (paidButUnconfirmed) {
          // Razorpay took the money, but verify failed or timed out. The webhook may already
          // have settled it, so check once before falling back to delayed refreshes.
          try {
            if (c.isAlreadyPaid && (await c.isAlreadyPaid(id))) return paidSuccess();
          } catch {
            // fall through to the info toast
          }
          toast.info('Payment received — confirming…');
          timers.current.push(setTimeout(refresh, 5000), setTimeout(refresh, 15000));
        } else {
          toast.error(c.errorMessage(err));
        }
        return false;
      } finally {
        stopOwnWatcher();
        busy.current = false;
        setPayingId(null);
      }
    },
    [refresh, startWatcher],
  );

  return { pay, payingId };
}
