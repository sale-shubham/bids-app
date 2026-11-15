'use client';
import { apiErrorCode } from '@/lib/api-client';
import { ME_KEY } from '@/features/members/use-members';
import { useRazorpayPayment } from '@/features/payments/use-razorpay-payment';
import { CREDITS_KEY, REFERRAL_KEY } from '@/features/referrals/use-referrals';
import { createCommissionCheckout, fetchCommission, payCommissionWithCredits } from './commissions.api';
import { commissionErrorMessage } from './commissions.errors';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const INVALIDATE = [['commissions'], ME_KEY] as const;

/**
 * Pays one commission: a thin wrapper over `useRazorpayPayment`.
 * `pay(id)` resolves true once verified. `payingId` blocks double clicks.
 * `confirmStub` is supplied by the page (a dialog) so test mode never loads checkout.js.
 */
export function usePayCommission(confirmStub: () => Promise<boolean>) {
  const qc = useQueryClient();
  const card = useRazorpayPayment({
    createCheckout: createCommissionCheckout,
    isAlreadyPaid: async (id) => (await fetchCommission(id)).status === 'PAID',
    invalidateKeys: INVALIDATE,
    confirmStub,
    successMessage: 'Payment successful. Commission paid.',
    errorMessage: commissionErrorMessage,
    onCheckoutError: (err) => {
      if (apiErrorCode(err) === 'COMMISSION_NOT_DUE') for (const queryKey of INVALIDATE) void qc.invalidateQueries({ queryKey });
    },
  });
  const credits = useMutation({
    mutationFn: payCommissionWithCredits,
    onSuccess: () => {
      for (const queryKey of [...INVALIDATE, REFERRAL_KEY, CREDITS_KEY]) void qc.invalidateQueries({ queryKey });
    },
  });
  return { ...card, payWithCredits: credits };
}
