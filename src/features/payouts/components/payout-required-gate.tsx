'use client';
import * as React from 'react';
import { Notice } from '@/components/common/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicSettings } from '@/features/settings/use-settings';
import { usePayoutAccount } from '../use-payouts';

/**
 * Wraps the new-auction form. When the platform's checkout mode is `required` and the seller's payout
 * account is not ACTIVE, shows a notice linking to /sell/payouts instead of the form. In `off` / `optional`
 * mode (or when the account cannot be loaded, since the API enforces it with PAYOUT_ACCOUNT_REQUIRED) the form renders.
 */
export function PayoutRequiredGate({ children }: { children: React.ReactNode }) {
  const settings = usePublicSettings();
  const required = settings.data?.checkoutMode === 'required';
  const account = usePayoutAccount(required);

  if (settings.isLoading || (required && account.isLoading)) return <Skeleton className="h-96 w-full" />;
  if (!required || account.isError || account.data?.status === 'ACTIVE') return <>{children}</>;

  const status = account.data?.status;
  return (
    <Notice className="mx-auto max-w-3xl" action={{ label: 'Go to payout account', href: '/sell/payouts' }}>
      {status
        ? 'Your payout account is not active yet. You can create auctions once it has been verified.'
        : 'Set up your payout account before creating an auction, so buyers can pay you through the platform.'}
    </Notice>
  );
}
