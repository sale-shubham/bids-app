'use client';
import { PageHeader } from '@/components/common/page-header';
import { PayoutAccountPanel } from '@/features/payouts/components/payout-account-panel';

export default function SellPayoutsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Payouts" description="Where we send the money when a buyer pays for one of your auctions." />
      <PayoutAccountPanel />
    </div>
  );
}
