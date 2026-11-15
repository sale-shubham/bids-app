'use client';
import { PayoutAccountPanel } from '@/features/payouts/components/payout-account-panel';

export default function SellPayoutsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground">Where we send the money when a buyer pays for one of your auctions.</p>
      </div>
      <PayoutAccountPanel />
    </div>
  );
}
