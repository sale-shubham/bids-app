'use client';
import { Suspense } from 'react';
import { ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { StatusTabs } from '@/features/admin/components/admin-list';
import { useUrlState } from '@/features/admin/use-url-state';
import { OffersList, usePendingOffers } from '@/features/second-chance/components/offers-section';
import { SaleListBody } from '@/features/sales/components/sale-list';
import { SALE_TABS } from '@/features/sales/sales.utils';
import type { SaleStatus } from '@/features/sales/sales.types';
import { StrikeBanner } from '@/features/strikes/components/strike-banner';

const DEFAULTS = { tab: 'all' };

function PurchasesView() {
  const { values, update } = useUrlState(DEFAULTS);
  const { pending } = usePendingOffers();
  const tabs = [...SALE_TABS, { value: 'offers', label: pending.length > 0 ? `Offers (${pending.length})` : 'Offers' }];
  const tab = tabs.find((t) => t.value === values.tab)?.value ?? 'all';

  return (
    <div className="space-y-4">
      <PageHeader title="Purchases" />
      <StrikeBanner />
      <ListToolbar tabs={<StatusTabs value={tab} tabs={tabs} onChange={(v) => update({ tab: v })} />} />
      {tab === 'offers' ? <OffersList /> : <SaleListBody role="buyer" status={tab as SaleStatus | 'all'} />}
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense>
      <PurchasesView />
    </Suspense>
  );
}
