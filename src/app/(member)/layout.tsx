'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { PushPermissionPrompt } from '@/components/common/push-permission-prompt';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { moreTab, useNav } from '@/components/layout/nav-items';

// Member area: any signed-in role (watchlist, my bids, profile). The edge gate
// (src/proxy.ts) enforces the finer bidder / auctioneer split.
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  return (
    <AuthGuard allow={['BIDDER', 'AUCTIONEER', 'SUPER_ADMIN']}>
      <PushPermissionPrompt />
      <DashboardShell nav={nav} moreTab={moreTab}>{children}</DashboardShell>
    </AuthGuard>
  );
}
