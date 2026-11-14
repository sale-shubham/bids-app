'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { moreTab, useNav } from '@/components/layout/nav-items';

// Auctioneer area (/sell/*). SUPER_ADMIN may also enter.
export default function AuctioneerLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  return (
    <AuthGuard allow={['AUCTIONEER', 'SUPER_ADMIN']}>
      <DashboardShell nav={nav} moreTab={moreTab}>{children}</DashboardShell>
    </AuthGuard>
  );
}
