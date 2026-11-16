// Single source of truth for the app's route classes. Imported by the edge
// gate (`src/proxy.ts`), `AuthBootstrap` and `api-client.ts`'s forceLogout()
// so they can never drift apart.
//
// Keep this file dependency-free: `proxy.ts` imports it on every request.

export type Role = 'MEMBER' | 'SUPER_ADMIN';

/** What the API may still send for one release (before the single-MEMBER migration reaches every token). */
export type LegacyRole = 'BIDDER' | 'AUCTIONEER';

/**
 * Collapses any role value the API or an old JWT may carry to the current `Role`.
 * `BIDDER` / `AUCTIONEER` (the pre-MEMBER roles) and any unknown value become `MEMBER`;
 * only `SUPER_ADMIN` stays an admin. Returns undefined for a missing role.
 */
export function normalizeRole(role: string | null | undefined): Role | undefined {
  if (!role) return undefined;
  return role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'MEMBER';
}

// Guest-only: a logged-in user is redirected away from these (exact match). `/`
// is the app's root (a bare redirect to /login; the marketing site lives in the
// separate bids-website repo), so a signed-in user hitting it lands on their home.
export const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password', '/'];

// Public: reachable logged-in or logged-out, never redirected. They render in
// the same app shell as the signed-in area (guest mode when logged out).
export const PUBLIC_PREFIXES = ['/auctions', '/sold', '/leaderboard', '/sellers', '/pages', '/suspended'];

// Member area: MEMBER only (one account buys and sells). SUPER_ADMIN is bounced to /admin
// (P2X pattern: the admin lives only under /admin plus the public pages).
//   /my-bids, /purchases (+ /purchases/[id], /purchases/offers/[id]), /sell (everything under it:
//   /sell/sales, /sell/payouts, /sell/analytics ...), /watchlist, /profile, /notifications.
export const MEMBER_PREFIXES = ['/my-bids', '/purchases', '/sell', '/watchlist', '/profile', '/notifications'];

// Admin area: SUPER_ADMIN only (/admin, /admin/members, /admin/auctions, /admin/commissions,
// /admin/payments, /admin/sales, /admin/invoices, /admin/categories, /admin/reviews, /admin/reports, /admin/settings, /admin/profile).
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

export function homeFor(role: Role | LegacyRole) {
  return normalizeRole(role) === 'SUPER_ADMIN' ? '/admin' : '/auctions';
}

export const isAuthRoute = (path: string) => startsWithAny(path, AUTH_ROUTES);
export const isAdminRoute = (path: string) => startsWithAny(path, [ADMIN_PREFIX]);
export const isMemberRoute = (path: string) => startsWithAny(path, MEMBER_PREFIXES);
export const isPublicRoute = (path: string) => startsWithAny(path, PUBLIC_PREFIXES);

/** Routes the edge gate has an opinion about (everything else passes straight through). */
export const isGatedRoute = (path: string) =>
  isAuthRoute(path) || isAdminRoute(path) || isMemberRoute(path);

export type Gate = 'allow' | 'login' | 'home';

/**
 * Pure decision for the edge gate (`src/proxy.ts`): `allow` = serve the page,
 * `login` = bounce a guest to /login?next=, `home` = send the signed-in user to
 * their role home (or, on an auth route, to `?next=` for members). Legacy BIDDER / AUCTIONEER count as MEMBER.
 */
export function gateFor(path: string, rawRole: Role | LegacyRole | undefined): Gate {
  const role = normalizeRole(rawRole);
  if (isAuthRoute(path)) return role ? 'home' : 'allow';
  if (!isGatedRoute(path)) return 'allow';
  if (!role) return 'login';
  if (isAdminRoute(path)) return role === 'SUPER_ADMIN' ? 'allow' : 'home';
  if (role === 'SUPER_ADMIN') return 'home'; // admins only use /admin/* + the public pages
  return 'allow'; // member area: MEMBER (also the legacy BIDDER / AUCTIONEER values)
}

/** Where a visitor sends the user after login: `?next=` for members only, else their home. */
export function destinationFor(rawRole: Role | LegacyRole, next: string | null | undefined) {
  const role = normalizeRole(rawRole) ?? 'MEMBER';
  return (role === 'SUPER_ADMIN' ? null : safeNextPath(next)) ?? homeFor(role);
}
