'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CountBadge } from '@/components/common/count-badge';
import type { NavItem } from './dashboard-shell';

// The bar's fixed 4th tab — the page that hosts the overflow grid plus
// theme/install/update/logout (MorePage): "Profile" (/profile for members,
// /admin/profile for SUPER_ADMIN), or "Log in" for a guest on a public page. Declared beside each role's nav array.
export interface MoreTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Up to 3 nav items surface as bottom-bar tabs; the rest live on the 4th
// tab's page (see more-page.tsx), same split MorePage uses to render its grid.
// Items flagged `pinMobile` win the bottom-bar slots (in array order) so the
// mobile tab set can differ from the desktop sidebar's first 3; with no
// pinned items it falls back to positional slicing.
export const MAX_BOTTOM_ITEMS = 3;

export function getBottomNavItems(nav: NavItem[]): NavItem[] {
  const pinned = nav.filter((item) => item.pinMobile);
  return pinned.length > 0 ? pinned.slice(0, MAX_BOTTOM_ITEMS) : nav.slice(0, MAX_BOTTOM_ITEMS);
}

export function getOverflowNavItems(nav: NavItem[]): NavItem[] {
  const bottomHrefs = new Set(getBottomNavItems(nav).map((item) => item.href));
  return nav.filter((item) => !bottomHrefs.has(item.href) && !item.hideMobile);
}

// Hrefs that are a literal path-prefix of a sibling nav item's route (e.g.
// '/admin' vs. '/admin/members') must match exactly — otherwise the prefix
// check below would light up both items at once.
const EXACT_MATCH_HREFS = new Set(['/admin']);

export function isNavActive(pathname: string, href: string) {
  if (EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function MobileBottomNav({ nav, moreTab }: { nav: NavItem[]; moreTab: MoreTab }) {
  const pathname = usePathname();

  const primary = getBottomNavItems(nav);
  const overflow = getOverflowNavItems(nav);
  // The 4th tab always renders, even with zero overflow nav items — its page
  // also hosts theme/install/update/logout, which must stay reachable on
  // mobile. It reads as active on any overflow route too (e.g. /businesses
  // lights up Profile for a member).
  const moreActive = pathname === moreTab.href || overflow.some((item) => isNavActive(pathname, item.href));
  // An overflow item with a count (Chat's unread messages) lives on the 4th
  // tab's grid, so the tab itself carries a dot — otherwise a phone would show
  // the count nowhere until somebody happened to open Profile.
  const moreHasBadge = overflow.some((item) => (item.badge ?? 0) > 0);

  // h-20 = a 64px tab row + a fixed 16px bottom gap (pb-4), so the tabs clear
  // the iOS home indicator / Android gesture bar. A fixed gap, not
  // env(safe-area-inset-bottom): that is 0 without viewport-fit=cover. Solid
  // background, no backdrop-blur-sm (iOS WebKit re-rasterises children under a
  // backdrop-filter and softens them). <main> in dashboard-shell.tsx pads
  // pb-36 to clear this 80px bar plus the chat FAB above it.
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-20 items-stretch border-t bg-background pb-4 md:hidden">
      {primary.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <span className="relative">
              <item.icon className="h-5 w-5" />
              <CountBadge count={item.badge} compact className="absolute -right-3 -top-2" />
            </span>
            {item.label}
          </Link>
        );
      })}
      <Link
        href={moreTab.href}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
          moreActive ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <span className="relative">
          <moreTab.icon className="h-5 w-5" />
          {moreHasBadge && (
            <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background">
              <span className="sr-only">New activity</span>
            </span>
          )}
        </span>
        {moreTab.label}
      </Link>
    </nav>
  );
}
