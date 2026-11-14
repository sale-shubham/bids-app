'use client';
import { AuthGuard } from '@/components/common/auth-guard';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AdminNav } from '@/features/admin/components/admin-nav';
import { moreTab, useNav } from '@/components/layout/nav-items';

// Admin area (/admin/*): SUPER_ADMIN only.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const nav = useNav();
  return (
    <AuthGuard allow={['SUPER_ADMIN']}>
      <DashboardShell nav={nav} moreTab={moreTab}><AdminNav />
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}
