'use client';
import { Archive, Banknote, BarChart3, FileUp, Flag, FolderTree, Gavel, Heart, Landmark, LayoutDashboard, LogIn, FileText, Receipt, Settings, ShieldAlert, ShoppingBag, Star, Store, Trophy, User, Users, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import type { NavItem } from './dashboard-shell';
import type { MoreTab } from './mobile-bottom-nav';
import { useWatchlistActiveCount } from '@/features/watchlist/use-watchlist';

// One member nav (MEMBER buys and sells with one account). SUPER_ADMIN has its own list
// below: it only uses /admin/* plus the public pages. The `group` headings ("Buying",
// "Selling") show in the desktop sidebar; the phone bottom bar pins Auctions, My bids
// and My auctions (`pinMobile`) and the rest lands in the Profile grid.
export const MEMBER_NAV: NavItem[] = [
  { href: '/auctions', label: 'Auctions', icon: Gavel, pinMobile: true },
  { href: '/watchlist', label: 'Watchlist', icon: Heart },
  { href: '/sold', label: 'Sold', icon: Archive },
  { href: '/my-bids', label: 'My bids', icon: Trophy, group: 'Buying', pinMobile: true },
  { href: '/purchases', label: 'Purchases', icon: ShoppingBag, group: 'Buying' },
  { href: '/sell/auctions', label: 'My auctions', icon: Store, group: 'Selling', pinMobile: true },
  { href: '/sell/sales', label: 'Sales', icon: Banknote, group: 'Selling' },
  { href: '/sell/analytics', label: 'Analytics', icon: BarChart3, group: 'Selling' },
  { href: '/sell/payouts', label: 'Payouts', icon: Landmark, group: 'Selling' },
  { href: '/sell/bulk', label: 'Bulk upload', icon: FileUp, group: 'Selling' },
  { href: '/profile', label: 'Profile', icon: User, pinBottomDesktop: true, hideMobile: true },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/commissions', label: 'Commissions', icon: Receipt },
  { href: '/admin/payments', label: 'Payments', icon: Wallet },
  { href: '/admin/sales', label: 'Sales', icon: ShoppingBag },
  { href: '/admin/invoices', label: 'Invoices', icon: FileText },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/risk', label: 'Risk', icon: ShieldAlert },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/profile', label: 'Profile', icon: User, pinBottomDesktop: true, hideMobile: true },
];

// Logged-out visitors on the public pages (browse + watch live bids; bidding needs a login).
export const GUEST_NAV: NavItem[] = [
  { href: '/auctions', label: 'Auctions', icon: Gavel },
  { href: '/sold', label: 'Sold archive', icon: Archive },
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
  return MEMBER_NAV.map((item) => (item.href === '/watchlist' ? { ...item, badge: watching } : item));
}

export function useMoreTab(): MoreTab {
  const role = useAuthStore((s) => s.member?.role);
  return role === 'SUPER_ADMIN' ? adminMoreTab : memberMoreTab;
}
