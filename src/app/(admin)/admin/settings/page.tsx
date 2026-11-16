'use client';
import { Suspense } from 'react';
import { ListToolbar } from '@/components/common/list-toolbar';
import { PageHeader } from '@/components/common/page-header';
import { StatusTabs } from '@/features/admin/components/admin-list';
import { InvoiceSettings } from '@/features/admin/components/invoice-settings';
import { LegalSettings } from '@/features/admin/components/legal-settings';
import { MarketplaceSettings } from '@/features/admin/components/marketplace-settings';
import { useUrlState } from '@/features/admin/use-url-state';

const DEFAULTS = { tab: 'marketplace' };
const TABS = [
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'invoice', label: 'Invoice details' },
  { value: 'legal', label: 'Legal pages' },
];

// Not a list: the same header and toolbar-style tabs as the list pages. Each
// tab's form keeps its own Save button (the form state lives in the form).
function SettingsView() {
  const { values, update } = useUrlState(DEFAULTS);
  const tab = TABS.some((t) => t.value === values.tab) ? values.tab : 'marketplace';
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />
      <ListToolbar tabs={<StatusTabs value={tab} tabs={TABS} onChange={(v) => update({ tab: v })} />} />
      {tab === 'marketplace' && <MarketplaceSettings />}
      {tab === 'invoice' && <InvoiceSettings />}
      {tab === 'legal' && <LegalSettings />}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
