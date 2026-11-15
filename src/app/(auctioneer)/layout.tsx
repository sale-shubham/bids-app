'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useMoreTab, useNav } from '@/components/layout/nav-items';
import { UnpaidCommissionBanner } from '@/features/commissions/components/unpaid-commission-banner';

// Auctioneer area (/sell/*): AUCTIONEER only (SUPER_ADMIN lives under /admin).
export default function AuctioneerLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  const moreTab = useMoreTab();
  return (
    <AuthGuard allow={['AUCTIONEER']}>
      <DashboardShell nav={nav} moreTab={moreTab}>
        <UnpaidCommissionBanner />
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
