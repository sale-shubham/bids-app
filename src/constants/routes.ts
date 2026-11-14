// Single source of truth for the app's route classes. Imported by the edge
// gate (`src/proxy.ts`), `AuthBootstrap` and `api-client.ts`'s forceLogout()
// so they can never drift apart.
//
// Keep this file dependency-free: `proxy.ts` imports it on every request.

export type Role = 'BIDDER' | 'AUCTIONEER' | 'SUPER_ADMIN';

// Guest-only: a logged-in user is redirected away from these (exact match).
export const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

// Public: reachable logged-in or logged-out, never redirected.
export const PUBLIC_PREFIXES = [
  '/auctions',
  '/leaderboard',
  '/sellers',
  '/how-it-works',
  '/about',
  '/contact',
  '/pages',
  '/suspended',
];

// Member: any signed-in role.
export const MEMBER_PREFIXES = ['/watchlist', '/profile', '/notifications'];

// Bidder area (SUPER_ADMIN may also enter).
export const BIDDER_PREFIXES = ['/my-bids'];

// Auctioneer area (SUPER_ADMIN may also enter).
export const AUCTIONEER_PREFIX = '/sell';

// Admin area: SUPER_ADMIN only.
export const ADMIN_PREFIX = '/admin';

// Exact-match, or prefix followed by `/`.
export function startsWithAny(path: string, prefixes: string[]) {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

// `?next=` carries where the user was headed when the edge gate bounced them to
// /login. Only same-origin app paths survive (single leading `/`, no backslash,
// not an auth route).
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  if (startsWithAny(next.split('?')[0], AUTH_ROUTES)) return null;
  return next;
}

export function homeFor(role: Role) {
  if (role === 'SUPER_ADMIN') return '/admin';
  if (role === 'AUCTIONEER') return '/sell/auctions';
  return '/auctions';
}

export const isAuthRoute = (path: string) => startsWithAny(path, AUTH_ROUTES);
export const isAdminRoute = (path: string) => startsWithAny(path, [ADMIN_PREFIX]);
export const isAuctioneerRoute = (path: string) => startsWithAny(path, [AUCTIONEER_PREFIX]);
export const isBidderRoute = (path: string) => startsWithAny(path, BIDDER_PREFIXES);
export const isMemberRoute = (path: string) => startsWithAny(path, MEMBER_PREFIXES);
export const isPublicRoute = (path: string) => path === '/' || startsWithAny(path, PUBLIC_PREFIXES);
