'use client';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { GUEST_NAV, guestMoreTab, useMoreTab, useNav } from '@/components/layout/nav-items';
import { ShellFooter } from '@/components/layout/shell-footer';
import { useAuthStore } from '@/store/auth-store';
import { useAuthHref } from '@/hooks/use-login-href';

// The public pages' (auctions, leaderboard, sellers, legal pages, /suspended)
// wrapper: the same <DashboardShell> as the signed-in area. Logged out (or
// while the session check is still running, so the server HTML is the guest
// one) it runs in guest mode: Auctions / Leaderboard nav, Log in / Sign up in
// the header, a Log in tab on the phone bar. Signed in it shows the member's
// own nav, so browsing never feels like leaving the app.
export function PublicShell({ children }: { children: React.ReactNode }) {
  const member = useAuthStore((s) => s.member);
  const nav = useNav();
  const moreTab = useMoreTab();
  const loginHref = useAuthHref('/login');

  if (!member) {
    return (
      <DashboardShell nav={GUEST_NAV} moreTab={guestMoreTab(loginHref)} guest>
        {children}
        <ShellFooter />
      </DashboardShell>
    );
  }
  return (
    <DashboardShell nav={nav} moreTab={moreTab}>
      {children}
      <ShellFooter />
    </DashboardShell>
  );
}
