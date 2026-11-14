'use client';
import { Gavel, Heart, Home, LayoutDashboard, Store, Trophy, User } from 'lucide-react';
import { useAuthStore, type Role } from '@/store/auth-store';
import type { NavItem } from './dashboard-shell';
import type { MoreTab } from './mobile-bottom-nav';
import { useWatchlistActiveCount } from '@/features/watchlist/use-watchlist';

interface RoleNavItem extends NavItem {
  /** Roles that see this item. Omitted = every signed-in role. */
  roles?: Role[];
}

const NAV: RoleNavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/auctions', label: 'Auctions', icon: Gavel },
  { href: '/watchlist', label: 'Watchlist', icon: Heart },
  { href: '/my-bids', label: 'My bids', icon: Trophy, roles: ['BIDDER', 'SUPER_ADMIN'] },
  { href: '/sell/auctions', label: 'Sell', icon: Store, roles: ['AUCTIONEER', 'SUPER_ADMIN'] },
  { href: '/admin', label: 'Admin', icon: LayoutDashboard, roles: ['SUPER_ADMIN'] },
  { href: '/profile', label: 'Profile', icon: User, pinBottomDesktop: true, hideMobile: true },
];

// The 4th mobile tab: Profile hosts the overflow grid + theme/install/logout.
export const moreTab: MoreTab = { href: '/profile', label: 'Profile', icon: User };

/** Sidebar / bottom-bar items for the signed-in role. */
export function useNav(): NavItem[] {
  const role = useAuthStore((s) => s.member?.role);
  const watching = useWatchlistActiveCount();
  return NAV.filter((item) => !item.roles || (role && item.roles.includes(role))).map((item) =>
    item.href === '/watchlist' ? { ...item, badge: watching } : item,
  );
}
