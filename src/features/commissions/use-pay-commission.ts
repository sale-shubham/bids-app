'use client';
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { verifyPayment } from '@/features/payments/payments.api';
import { ME_KEY } from '@/features/members/use-members';
import { openRazorpayCheckout, RazorpayCheckoutError } from '@/lib/razorpay';
import { apiErrorCode } from '@/lib/api-client';
import { createCommissionCheckout } from './commissions.api';
import { commissionErrorMessage } from './commissions.errors';

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

  React.useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const refresh = React.useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['commissions'] });
    void qc.invalidateQueries({ queryKey: ME_KEY });
  }, [qc]);

  const pay = React.useCallback(
    async (commissionId: string) => {
      if (busy.current) return false;
      busy.current = true;
      setPayingId(commissionId);
      let paidButUnconfirmed = false;
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
          const r = await openRazorpayCheckout({
            keyId: co.keyId,
            orderId: co.orderId,
            amountPaise: co.amountPaise,
            currency: co.currency,
            description: co.description,
            prefill: co.prefill,
          });
          paidButUnconfirmed = true;
          verifyInput = {
            orderId: r.razorpay_order_id,
            paymentId: r.razorpay_payment_id,
            signature: r.razorpay_signature,
          };
        }
        await verifyPayment(verifyInput);
        paidButUnconfirmed = false;
        toast.success('Payment successful. Commission paid.');
        refresh();
        return true;
      } catch (err) {
        if (err instanceof RazorpayCheckoutError) {
          if (err.reason === 'dismissed') toast('Payment cancelled');
          else toast.error(err.message);
        } else if (paidButUnconfirmed) {
          // Razorpay took the money; the webhook should still mark it paid server-side.
          toast.info('Payment received — confirming…');
          timers.current.push(setTimeout(refresh, 5000), setTimeout(refresh, 15000));
        } else {
          toast.error(commissionErrorMessage(err));
          if (apiErrorCode(err) === 'COMMISSION_NOT_DUE') refresh();
        }
        return false;
      } finally {
        busy.current = false;
        setPayingId(null);
      }
    },
    [confirmStub, refresh],
  );

  return { pay, payingId };
}
