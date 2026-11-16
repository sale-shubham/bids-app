import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import {
  destinationFor,
  gateFor,
  isAuthRoute,
  isGatedRoute,
  type LegacyRole,
  type Role,
} from "@/constants/routes";
import { serverApiOrigin } from "@/constants/api";

// Edge-side route gate. Verifies the SAME httpOnly access-token cookie the
// backend (bids-api) sets on every login/refresh (`nb_at`). JWT_SECRET here must
// equal the backend's JWT_SECRET (server-only env var, never NEXT_PUBLIC_ — see
// .env.example). No token is ever read/written by client JS.
//
// Areas (P2X pattern): public (no gate), member (MEMBER: /my-bids, /purchases, /sell/*,
// /watchlist, /profile, /notifications), admin (/admin/*, SUPER_ADMIN only). The legacy
// BIDDER / AUCTIONEER token roles count as MEMBER (normalised in gateFor / destinationFor).
// SUPER_ADMIN may only use /admin/* plus the public pages; the decision table is
// gateFor() in src/constants/routes.ts (unit-tested).
interface AccessPayload {
  sub: string;
  role: Role | LegacyRole;
  sid: string;
}

const ACCESS_COOKIE = "nb_at";
const REFRESH_COOKIE = "nb_rt";
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Route tables live in src/constants/routes.ts — shared with AuthBootstrap and
// api-client.ts's forceLogout() so the edge gate and the client gates can't
// disagree about which paths are public.

async function verifyAccess(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return payload as unknown as AccessPayload;
  } catch {
    return null;
  }
}

// Access token is short-lived (15 min) by design; the refresh cookie is the
// real 30-day session. A merely-expired access cookie shouldn't bounce a
// still-logged-in user to /login on every navigation, so mirror the backend's
// own refresh call here (server-to-server fetch, not subject to browser CORS)
// before giving up — same idea as the hospital project's middleware.ts.
async function refreshAccess(
  request: NextRequest,
): Promise<{ payload: AccessPayload; setCookies: string[] } | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader?.includes(`${REFRESH_COOKIE}=`)) return null;
  try {
    // Server-to-server call (Edge -> backend) — forward the incoming Cookie
    // header ourselves (there's no browser cookie jar on this leg for
    // `withCredentials` to draw on). The backend's Set-Cookie response
    // headers are forwarded verbatim to the real browser below, untouched —
    // we don't reconstruct them. The one value we need locally (to decide
    // the redirect) is the new access token, read straight from the JSON
    // body the backend already returns, same as the hospital project's
    // proxy.ts does — no Set-Cookie string parsing needed for it.
    const res = await fetch(`${serverApiOrigin()}/auth/refresh`, {
      method: "POST",
      headers: { cookie: cookieHeader },
    });
    if (!res.ok) return null;
    const setCookies = res.headers.getSetCookie?.() ?? [];
    const body = (await res.json()) as { data?: { accessToken?: string } };
    const newAccess = body?.data?.accessToken;
    const payload = newAccess ? await verifyAccess(newAccess) : null;
    return payload ? { payload, setCookies } : null;
  } catch {
    return null;
  }
}

// The bounce itself — keep the attempted path (with its query) so the login
// can return to it.
function loginRedirect(request: NextRequest) {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isGatedRoute(pathname)) return NextResponse.next();

  const accessCookie = request.cookies.get(ACCESS_COOKIE)?.value;

  let payload = accessCookie ? await verifyAccess(accessCookie) : null;
  let refreshedCookies: string[] = [];

  if (!payload) {
    const refreshed = await refreshAccess(request);
    if (refreshed) {
      payload = refreshed.payload;
      refreshedCookies = refreshed.setCookies;
      console.log(
        `[proxy] ${pathname} — refreshed access token, sub=${payload.sub} role=${payload.role}`,
      );
    } else {
      console.log(
        `[proxy] ${pathname} — refresh failed or no ${REFRESH_COOKIE} cookie`,
      );
    }
  }

  const role = payload?.role;
  let response: NextResponse;

  const gate = gateFor(pathname, role);
  if (gate === "login") {
    response = loginRedirect(request);
  } else if (gate === "home" && role) {
    // On an auth route a member returns to `?next=`; everywhere else it is just their home.
    const to = destinationFor(role, isAuthRoute(pathname) ? request.nextUrl.searchParams.get("next") : null);
    response = NextResponse.redirect(new URL(to, request.url));
  } else {
    response = NextResponse.next();
  }

  for (const cookie of refreshedCookies)
    response.headers.append("set-cookie", cookie);
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
