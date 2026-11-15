'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setAuctionDeposit } from './deposits.api';

export function useSetAuctionDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, depositPaise }: { id: string; depositPaise: number | null }) => setAuctionDeposit(id, depositPaise),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['auction'] });
    },
  });
}
