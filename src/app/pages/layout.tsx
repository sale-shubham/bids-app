import { PublicHeader } from '@/components/layout/public-header';

// Public content pages (legal copy) — reachable logged-out, so no DashboardShell;
// they use the same public header as home and browse.
export default function ContentPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      {children}
    </div>
  );
}
