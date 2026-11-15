'use client';
import { OffersSection } from '@/features/second-chance/components/offers-section';
import { StrikeBanner } from '@/features/strikes/components/strike-banner';
import { SaleList } from '@/features/sales/components/sale-list';

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
        <p className="text-muted-foreground">Pay for auctions you won, track delivery and confirm when it arrives.</p>
      </div>
      <StrikeBanner />
      <OffersSection />
      <SaleList role="buyer" />
    </div>
  );
}
