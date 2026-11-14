import { PublicHeader } from '@/components/layout/public-header';
import { SiteFooter } from '@/components/layout/site-footer';

// Public content pages (legal copy) — reachable logged-out, so no DashboardShell;
// they use the same public header as home and browse.
export default function ContentPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
