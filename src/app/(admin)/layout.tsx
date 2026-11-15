'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useMoreTab, useNav } from '@/components/layout/nav-items';

// Admin area (/admin/*): SUPER_ADMIN only. The sidebar (useNav) lists every admin page.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  const moreTab = useMoreTab();
  return (
    <AuthGuard allow={['SUPER_ADMIN']}>
      <DashboardShell nav={nav} moreTab={moreTab}>
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
