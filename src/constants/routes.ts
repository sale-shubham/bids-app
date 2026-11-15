// Single source of truth for the app's route classes. Imported by the edge
// gate (`src/proxy.ts`), `AuthBootstrap` and `api-client.ts`'s forceLogout()
// so they can never drift apart.
//
// Keep this file dependency-free: `proxy.ts` imports it on every request.

export type Role = 'BIDDER' | 'AUCTIONEER' | 'SUPER_ADMIN';

// Guest-only: a logged-in user is redirected away from these (exact match). `/`
// is the app's root (a bare redirect to /login; the marketing site lives in the
// separate bids-website repo), so a signed-in user hitting it lands on their home.
export const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/'];

// Public: reachable logged-in or logged-out, never redirected. They render in
// the same app shell as the signed-in area (guest mode when logged out).
export const PUBLIC_PREFIXES = ['/auctions', '/leaderboard', '/sellers', '/pages', '/suspended'];

// Member area: BIDDER / AUCTIONEER only. SUPER_ADMIN is bounced to /admin (P2X
// pattern: the admin lives only under /admin plus the public pages).
export const MEMBER_PREFIXES = ['/watchlist', '/profile', '/notifications'];

// Bidder area (BIDDER only): /my-bids, /purchases and /purchases/[id].
export const BIDDER_PREFIXES = ['/my-bids', '/purchases'];

// Auctioneer area (AUCTIONEER only): everything under /sell, including /sell/sales, /sell/sales/[id] and /sell/payouts.
export const AUCTIONEER_PREFIX = '/sell';

// Admin area: SUPER_ADMIN only (/admin, /admin/members, /admin/auctions, /admin/commissions,
// /admin/payments, /admin/sales, /admin/reviews, /admin/reports, /admin/settings, /admin/profile).
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
export const isPublicRoute = (path: string) => startsWithAny(path, PUBLIC_PREFIXES);

/** Routes the edge gate has an opinion about (everything else passes straight through). */
export const isGatedRoute = (path: string) =>
  isAuthRoute(path) || isAdminRoute(path) || isAuctioneerRoute(path) || isBidderRoute(path) || isMemberRoute(path);

export type Gate = 'allow' | 'login' | 'home';

/**
 * Pure decision for the edge gate (`src/proxy.ts`): `allow` = serve the page,
 * `login` = bounce a guest to /login?next=, `home` = send the signed-in user to
 * their role home (or, on an auth route, to `?next=` for member roles).
 */
export function gateFor(path: string, role: Role | undefined): Gate {
  if (isAuthRoute(path)) return role ? 'home' : 'allow';
  if (!isGatedRoute(path)) return 'allow';
  if (!role) return 'login';
  if (isAdminRoute(path)) return role === 'SUPER_ADMIN' ? 'allow' : 'home';
  if (role === 'SUPER_ADMIN') return 'home'; // admins only use /admin/* + the public pages
  if (isAuctioneerRoute(path)) return role === 'AUCTIONEER' ? 'allow' : 'home';
  if (isBidderRoute(path)) return role === 'BIDDER' ? 'allow' : 'home';
  return 'allow'; // member area, BIDDER or AUCTIONEER
}

/** Where a visitor sends the user after login: `?next=` for member roles only, else their home. */
export function destinationFor(role: Role, next: string | null | undefined) {
  return (role === 'SUPER_ADMIN' ? null : safeNextPath(next)) ?? homeFor(role);
}
