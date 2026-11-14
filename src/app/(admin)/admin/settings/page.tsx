'use client';
import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/features/admin/components/admin-list';
import { LegalSettings } from '@/features/admin/components/legal-settings';
import { MarketplaceSettings } from '@/features/admin/components/marketplace-settings';
import { useUrlState } from '@/features/admin/use-url-state';

const DEFAULTS = { tab: 'marketplace' };

function SettingsView() {
  const { values, update } = useUrlState(DEFAULTS);
  const tab = values.tab === 'legal' ? 'legal' : 'marketplace';
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Marketplace rules and legal pages." />
      <Tabs value={tab} onValueChange={(v) => update({ tab: v })}>
        <TabsList>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="legal">Legal pages</TabsTrigger>
        </TabsList>
        <TabsContent value="marketplace">
          <MarketplaceSettings />
        </TabsContent>
        <TabsContent value="legal">
          <LegalSettings />
        </TabsContent>
      </Tabs>
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
