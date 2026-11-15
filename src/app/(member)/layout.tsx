'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { PushPermissionPrompt } from '@/components/common/push-permission-prompt';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useMoreTab, useNav } from '@/components/layout/nav-items';

// Member area (watchlist, notifications, profile): BIDDER / AUCTIONEER. SUPER_ADMIN is
// bounced to /admin by the edge gate (src/proxy.ts) and by this guard.
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  const moreTab = useMoreTab();
  return (
    <AuthGuard allow={['BIDDER', 'AUCTIONEER']}>
      <PushPermissionPrompt />
      <DashboardShell nav={nav} moreTab={moreTab}>{children}</DashboardShell>
    </AuthGuard>
  );
}
