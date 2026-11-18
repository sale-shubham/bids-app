'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { PushPermissionPrompt } from '@/components/common/push-permission-prompt';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { StrikeBanner } from '@/features/strikes/components/strike-banner';
import { useMoreTab, useNav } from '@/components/layout/nav-items';

// Member area (auctions you bid on and sell: /my-bids, /purchases, /sell/*, /watchlist,
// /notifications, /profile): MEMBER. The legacy BIDDER / AUCTIONEER values are
// normalised to MEMBER by AuthGuard for one release. SUPER_ADMIN is bounced to
// /admin by the edge gate (src/proxy.ts) and by this guard.
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  const moreTab = useMoreTab();
  return (
    <AuthGuard allow={['MEMBER']}>
      <PushPermissionPrompt />
      <DashboardShell nav={nav} moreTab={moreTab}>
        <div className="space-y-4">
          <StrikeBanner />
          {children}
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
