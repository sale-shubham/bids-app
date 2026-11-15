'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ME_KEY } from '@/features/members/use-members';
import { useRazorpayPayment } from '@/features/payments/use-razorpay-payment';
import { nextPagedParam } from '@/lib/paged';
import * as api from './sales.api';
import { isStaleSaleError, salePaymentErrorMessage } from './sales.errors';
import type { SaleListRole, SaleStatus, ShipSaleInput } from './sales.types';

export const saleKeys = {
  all: ['sales'] as const,
  one: (id: string) => ['sales', 'one', id] as const,
  mine: (role: SaleListRole, status: SaleStatus | 'all') => ['sales', 'mine', role, status] as const,
};

export function useMySales(role: SaleListRole, status: SaleStatus | 'all') {
  return useInfiniteQuery({
    queryKey: saleKeys.mine(role, status),
    queryFn: ({ pageParam }) => api.fetchMySales(role, status, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPagedParam,
  });
}

export function useSale(id: string) {
  return useQuery({ queryKey: saleKeys.one(id), queryFn: () => api.fetchSale(id), enabled: !!id });
}

/** Everything a sale change can affect: the sale lists, the auction detail (`sale`), my-bids rows, admin lists. */
export function useInvalidateSales() {
  const qc = useQueryClient();
  return () => {
    for (const queryKey of [saleKeys.all, ['auction'], ['auctions'], ['my-bids'], ['admin'], ['notifications']]) {
      void qc.invalidateQueries({ queryKey });
    }
  };
}

/** Pays one sale (Razorpay, or the stub confirm in test mode). `pay(saleId)` resolves true once verified. */
export function useSalePayment(confirmStub: () => Promise<boolean>) {
  const qc = useQueryClient();
  return useRazorpayPayment({
    createCheckout: api.createSaleCheckout,
    isAlreadyPaid: async (id) => (await api.fetchSale(id)).status !== 'AWAITING_PAYMENT',
    invalidateKeys: [saleKeys.all, ['auction'], ['my-bids'], ['notifications'], ME_KEY],
    confirmStub,
    successMessage: 'Payment successful. The seller has been notified.',
    errorMessage: salePaymentErrorMessage,
    onCheckoutError: (err) => {
      if (isStaleSaleError(err)) void qc.invalidateQueries({ queryKey: saleKeys.all });
    },
  });
}

export function useShipSale(id: string) {
  const done = useInvalidateSales();
  return useMutation({ mutationFn: (body: ShipSaleInput) => api.shipSale(id, body), onSuccess: done });
}

export function useConfirmSale(id: string) {
  const done = useInvalidateSales();
  return useMutation({ mutationFn: () => api.confirmSale(id), onSuccess: done });
}

export function useDisputeSale(id: string) {
  const done = useInvalidateSales();
  return useMutation({ mutationFn: (reason: string) => api.disputeSale(id, reason), onSuccess: done });
}
