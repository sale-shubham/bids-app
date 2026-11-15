'use client';
import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
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
    <div role="alert" className="mx-auto flex max-w-3xl items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
      <p>
        {status
          ? 'Your payout account is not active yet. You can create auctions once it has been verified.'
          : 'Set up your payout account before creating an auction, so buyers can pay you through the platform.'}{' '}
        <Link href="/sell/payouts" className="font-medium text-primary hover:underline">
          Go to payout account
        </Link>
      </p>
    </div>
  );
}
