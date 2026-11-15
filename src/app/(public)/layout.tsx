import { PublicShell } from '@/components/layout/public-shell';

// Public pages (auctions, leaderboard, sellers, legal pages, /suspended): reachable
// logged in or out, rendered inside the same app shell as the signed-in area.
// The pages themselves stay server components (data + generateMetadata for SEO);
// only this thin client wrapper knows about the session (guest mode).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
