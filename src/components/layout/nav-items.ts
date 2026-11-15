'use client';
import { Gavel, Heart, LayoutDashboard, LogIn, Receipt, Settings, Store, Trophy, User, Users, Wallet } from 'lucide-react';
import { useAuthStore, type Role } from '@/store/auth-store';
import type { NavItem } from './dashboard-shell';
import type { MoreTab } from './mobile-bottom-nav';
import { useWatchlistActiveCount } from '@/features/watchlist/use-watchlist';

interface RoleNavItem extends NavItem {
  /** Roles that see this item. Omitted = every member role (BIDDER and AUCTIONEER). */
  roles?: Role[];
}

// Member nav (BIDDER / AUCTIONEER). SUPER_ADMIN has its own list below: it only
// uses /admin/* plus the public pages.
const MEMBER_NAV: RoleNavItem[] = [
  { href: '/auctions', label: 'Auctions', icon: Gavel },
  { href: '/watchlist', label: 'Watchlist', icon: Heart },
  { href: '/my-bids', label: 'My bids', icon: Trophy, roles: ['BIDDER'] },
  { href: '/sell/auctions', label: 'Sell', icon: Store, roles: ['AUCTIONEER'] },
  { href: '/profile', label: 'Profile', icon: User, pinBottomDesktop: true, hideMobile: true },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
  { href: '/admin/commissions', label: 'Commissions', icon: Receipt },
  { href: '/admin/payments', label: 'Payments', icon: Wallet },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/profile', label: 'Profile', icon: User, pinBottomDesktop: true, hideMobile: true },
];

// Logged-out visitors on the public pages (browse + watch live bids; bidding needs a login).
export const GUEST_NAV: NavItem[] = [
  { href: '/auctions', label: 'Auctions', icon: Gavel },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

// The 4th mobile tab: Profile hosts the overflow grid + theme/install/logout.
const memberMoreTab: MoreTab = { href: '/profile', label: 'Profile', icon: User };
const adminMoreTab: MoreTab = { href: '/admin/profile', label: 'Profile', icon: User };

/** Guest 4th tab: a Log in shortcut (`loginHref` already carries `?next=` back to the current page). */
export function guestMoreTab(loginHref: string): MoreTab {
  return { href: loginHref, label: 'Log in', icon: LogIn };
}

/** Sidebar / bottom-bar items for the signed-in role. */
export function useNav(): NavItem[] {
  const role = useAuthStore((s) => s.member?.role);
  const watching = useWatchlistActiveCount();
  if (role === 'SUPER_ADMIN') return ADMIN_NAV;
  return MEMBER_NAV.filter((item) => !item.roles || (role && item.roles.includes(role))).map((item) =>
    item.href === '/watchlist' ? { ...item, badge: watching } : item,
  );
}

export function useMoreTab(): MoreTab {
  const role = useAuthStore((s) => s.member?.role);
  return role === 'SUPER_ADMIN' ? adminMoreTab : memberMoreTab;
}
