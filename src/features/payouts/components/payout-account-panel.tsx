'use client';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/api-client';
import { usePayoutAccount } from '../use-payouts';
import { PayoutForm } from './payout-form';
import { PayoutStatusCard } from './payout-status-card';

/** Body of /sell/payouts: status card when an account exists; the form when there is none or it was rejected. */
export function PayoutAccountPanel() {
  const { data: account, isLoading, error, refetch } = usePayoutAccount();

  if (isLoading) return <Skeleton className="h-64" />;
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{apiErrorMessage(error, 'Could not load your payout account')}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (!account) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Add your bank details to receive the money from buyers. Your account number is encrypted by our payment partner and is never shown again.
        </p>
        <PayoutForm />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <PayoutStatusCard account={account} />
      {account.status === 'REJECTED' && <PayoutForm />}
    </div>
  );
}
