'use client';
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { verifyPayment } from '@/features/payments/payments.api';
import { ME_KEY } from '@/features/members/use-members';
import { openRazorpayCheckout, RazorpayCheckoutError } from '@/lib/razorpay';
import { apiErrorCode } from '@/lib/api-client';
import { createCommissionCheckout, fetchCommission } from './commissions.api';
import { commissionErrorMessage } from './commissions.errors';

const VERIFY_TIMEOUT_MS = 20_000;
const WATCH_INTERVAL_MS = 4_000;
const WATCH_MAX_MS = 20 * 60 * 1000;

/**
 * Pays one commission: checkout -> Razorpay (or stub confirm) -> verify -> invalidate.
 * `pay(id)` resolves true once verified. `payingId` blocks double clicks.
 * `confirmStub` is supplied by the page (a dialog) so test mode never loads checkout.js.
 */
export function usePayCommission(confirmStub: () => Promise<boolean>) {
  const qc = useQueryClient();
  const [payingId, setPayingId] = React.useState<string | null>(null);
  const busy = React.useRef(false);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopWatcher = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    const t = timers.current;
    return () => {
      t.forEach(clearTimeout);
      stopWatcher.current?.();
    };
  }, []);

  const refresh = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['commissions'] });
    void qc.invalidateQueries({ queryKey: ME_KEY });
  }, [qc]);

  // While Razorpay Checkout is open, watch the commission on the server. If the browser callback
  // never fires (blocked popup, closed tab, flaky handler) the webhook still marks it PAID, and
  // we notice that here and abort the checkout. Polls every 4 s, and right away when the tab
  // regains focus or becomes visible; gives up after 20 minutes. Fetch errors are ignored.
  const startWatcher = React.useCallback((commissionId: string, onPaid: () => void) => {
    const started = Date.now();
    let stopped = false;
    let checking = false;
    const check = async () => {
      if (stopped || checking) return;
      if (Date.now() - started > WATCH_MAX_MS) return stop();
      checking = true;
      try {
        const c = await fetchCommission(commissionId);
        if (!stopped && c.status === 'PAID') onPaid();
      } catch {
        // transient; the next tick tries again
      } finally {
        checking = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check();
    };

    const interval = setInterval(() => void check(), WATCH_INTERVAL_MS);
    const stop = () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibility);
    return stop;
  }, []);

  const pay = React.useCallback(
    async (commissionId: string) => {
      if (busy.current) return false;
      busy.current = true;
      setPayingId(commissionId);
      let paidButUnconfirmed = false;
      let seenPaid = false;
      const watchAbort = new AbortController();
      const stopOwnWatcher = () => {
        stopWatcher.current?.();
        stopWatcher.current = null;
      };
      const paidSuccess = () => {
        toast.success('Payment successful. Commission paid.');
        refresh();
        return true;
      };
      try {
        const co = await createCommissionCheckout(commissionId);
        let verifyInput: { orderId: string; paymentId: string; signature: string };
        if (co.keyId === 'stub') {
          if (!(await confirmStub())) {
            toast('Payment cancelled');
            return false;
          }
          verifyInput = { orderId: co.orderId, paymentId: 'stub_pay_' + Date.now(), signature: 'stub' };
        } else {
          stopWatcher.current = startWatcher(commissionId, () => {
            seenPaid = true;
            watchAbort.abort();
          });
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
            if ((await fetchCommission(commissionId)).status === 'PAID') return paidSuccess();
          } catch {
            // fall through to the info toast
          }
          toast.info('Payment received — confirming…');
          timers.current.push(setTimeout(refresh, 5000), setTimeout(refresh, 15000));
        } else {
          toast.error(commissionErrorMessage(err));
          if (apiErrorCode(err) === 'COMMISSION_NOT_DUE') refresh();
        }
        return false;
      } finally {
        stopOwnWatcher();
        busy.current = false;
        setPayingId(null);
      }
    },
    [confirmStub, refresh, startWatcher],
  );

  return { pay, payingId };
}
