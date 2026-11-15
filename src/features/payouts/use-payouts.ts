'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './payouts.api';
import type { PayoutAccountInput } from './payouts.types';

export const PAYOUT_ACCOUNT_KEY = ['payouts', 'account'] as const;

export function usePayoutAccount(enabled = true) {
  return useQuery({ queryKey: PAYOUT_ACCOUNT_KEY, queryFn: api.fetchPayoutAccount, enabled });
}

export function useCreatePayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PayoutAccountInput) => api.createPayoutAccount(body),
    onSuccess: (account) => qc.setQueryData(PAYOUT_ACCOUNT_KEY, account),
  });
}
