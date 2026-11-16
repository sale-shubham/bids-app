'use client';
import { Suspense } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { SaleList } from '@/features/sales/components/sale-list';

export default function SellSalesPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Sales" />
      <Suspense>
        <SaleList role="seller" />
      </Suspense>
    </div>
  );
}
