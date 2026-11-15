'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useMoreTab, useNav } from '@/components/layout/nav-items';

// Bidder area (/my-bids): BIDDER only (SUPER_ADMIN lives under /admin).
export default function BidderLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  const moreTab = useMoreTab();
  return (
    <AuthGuard allow={['BIDDER']}>
      <DashboardShell nav={nav} moreTab={moreTab}>{children}</DashboardShell>
    </AuthGuard>
  );
}
