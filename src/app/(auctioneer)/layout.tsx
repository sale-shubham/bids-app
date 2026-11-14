'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { moreTab, useNav } from '@/components/layout/nav-items';
import { UnpaidCommissionBanner } from '@/features/commissions/components/unpaid-commission-banner';

// Auctioneer area (/sell/*). SUPER_ADMIN may also enter.
export default function AuctioneerLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  return (
    <AuthGuard allow={['AUCTIONEER', 'SUPER_ADMIN']}>
      <DashboardShell nav={nav} moreTab={moreTab}>
        <UnpaidCommissionBanner />
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
