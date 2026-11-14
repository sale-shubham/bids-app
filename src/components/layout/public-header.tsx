import Link from 'next/link';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';

// Header for public pages (home, browse): brand, a couple of links, theme toggle
// and the account control (user menu, or Login / Sign up when logged out).
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-2xl font-extrabold text-gradient">
          NobleBid
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-4 text-sm font-medium sm:flex">
          <Link href="/auctions" className="text-muted-foreground hover:text-foreground">
            Auctions
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
