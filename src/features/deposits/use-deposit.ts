'use client';
import { useQueryClient } from '@tanstack/react-query';
import { ME_KEY } from '@/features/members/use-members';
import { fetchAuction } from '@/features/auctions/auctions.api';
import { useRazorpayPayment } from '@/features/payments/use-razorpay-payment';
import * as api from './deposits.api';
import { depositErrorMessage, isStaleDepositError } from './deposits.errors';

/** Pays the deposit for one auction (Razorpay, or the stub confirm in test mode). `pay(auctionId)` resolves true once verified. */
export function useDepositPayment(confirmStub: () => Promise<boolean>) {
  const qc = useQueryClient();
  return useRazorpayPayment({
    createCheckout: api.createDepositCheckout,
    isAlreadyPaid: async (id) => (await fetchAuction(id)).auction.deposit?.status === 'HELD',
    invalidateKeys: [['auction'], ['auctions'], ['notifications'], ME_KEY],
    confirmStub,
    successMessage: 'Deposit paid. You can bid now.',
    errorMessage: depositErrorMessage,
    onCheckoutError: (err) => {
      if (isStaleDepositError(err)) void qc.invalidateQueries({ queryKey: ['auction'] });
    },
  });
}
