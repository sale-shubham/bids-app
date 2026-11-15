'use client';
import { SaleList } from '@/features/sales/components/sale-list';

export default function SellSalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
        <p className="text-muted-foreground">Auctions that sold. Ship paid orders and follow your payout.</p>
      </div>
      <SaleList role="seller" />
    </div>
  );
}
