'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { moreTab, useNav } from '@/components/layout/nav-items';

// Bidder area (/my-bids). SUPER_ADMIN may also enter.
export default function BidderLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  return (
    <AuthGuard allow={['BIDDER', 'SUPER_ADMIN']}>
      <DashboardShell nav={nav} moreTab={moreTab}>{children}</DashboardShell>
    </AuthGuard>
  );
}
