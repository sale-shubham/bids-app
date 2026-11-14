import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { queryClient } from "./query-client";
import { useAuthStore } from "@/store/auth-store";
import { isPublicRoute } from "@/constants/routes";
import { API_ORIGIN } from "@/constants/api";
import { syncAppBadge } from "@/lib/push";

const API_BASE = API_ORIGIN;

// Both access and refresh tokens live in httpOnly cookies set by the backend
// (withCredentials rides them along automatically) — no token ever touches
// JS, so there's nothing to store or attach as an Authorization header here.
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// A failed refresh is not one thing. "The server said no" means the session is
// really over; "I could not reach the server" means nothing about the session
// at all, and treating the two alike is what signs people out of an installed
// PWA on a cold start: the first request after a launch goes out while the
// phone's radio is still coming up, fails with no response, and the old code
// read that as "logged out" and redirected to /login even though both cookies
// were sitting there, valid.
type RefreshResult =
  | "renewed" // new nb_at cookie applied — retry the original request
  | "rejected" // backend refused: session genuinely dead, cookies cleared
  | "unreachable"; // network/5xx — verdict unknown, change nothing

// Single-flight refresh: queue concurrent 401s behind one refresh call. The
// backend rotates the nb_at/nb_rt cookies via Set-Cookie on success — the
// browser applies them, so the retried request just needs to go out again.
let refreshing: Promise<RefreshResult> | null = null;

async function doRefresh(): Promise<RefreshResult> {
  try {
    await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
    return "renewed";
  } catch (error) {
    if (!axios.isAxiosError(error)) return "unreachable";
    const status = error.response?.status;
    // No `response` at all: DNS, radio, timeout, aborted — the request never
    // got a verdict. A 5xx is the server failing, not the session ending.
    if (status === undefined || status >= 500) return "unreachable";
    return "rejected";
  }
}

// True when an error says nothing about whether the user is signed in: it never
// reached the API, or the API broke. Callers must NOT clear the session on
// these — retry instead. `authUnreachable` is stamped below onto the original
// 401 when the refresh that followed it could not reach the backend, because
// that rejection still carries the 401's own status.
export function isUnreachableError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if ((err as AxiosError & { authUnreachable?: boolean }).authUnreachable)
    return true;
  const status = err.response?.status;
  return status === undefined || status >= 500;
}

// Refresh came back 401 too — the backend already cleared the nb_at/nb_rt
// cookies (see bids-api's auth.controller.ts's refresh()), so the
// session is dead server-side. Wipe the client-side mirror of it (zustand
// store + react-query cache) so no stale member/business/listing data lingers
// in memory, then send the user to /login — a hard navigation, not
// router.push(), since this runs inside an axios interceptor, outside React.
let loggedOut = false;
function forceLogout() {
  if (typeof window === "undefined" || loggedOut) return;
  // Public pages (PUBLIC_PREFIXES — /pages/* legal copy, linked from /signup
  // before an account exists) are reachable logged-out by design. A 401 there
  // means "no session", not "session died" — ejecting to /login made those
  // pages unreachable for anyone without a cookie. Drop the stale store mirror
  // but stay put: don't clear the query cache (it holds this page's own public
  // ['legal-page'] data) and don't navigate.
  if (isPublicRoute(window.location.pathname)) {
    useAuthStore.getState().clear();
    return;
  }
  // Must be set before queryClient.clear() — clearing the cache makes the
  // still-mounted `['member-me']` useQuery (AuthBootstrap) refetch
  // immediately, synchronously, before window.location.href's navigation
  // actually takes effect. That refetch 401s -> refresh 401s -> forceLogout()
  // again, re-entering this function while still on the *old* page (not yet
  // '/login'), so a pathname check alone can't catch it — only this flag can.
  loggedOut = true;
  useAuthStore.getState().clear();
  queryClient.clear();
  // Session gone = its push subscription gone server-side; clear the icon badge too.
  void syncAppBadge(0);
  // Absolute URL (same full-page navigation): Next 16 lints relative ones.
  window.location.href = new URL("/login", window.location.origin).href;
}

// ACCOUNT_SUSPENDED (2026-09-12) — a distinct backend error code (not just a
// generic 401/403) so a paused member is routed to a dedicated "contact
// admin" screen instead of the bare /login bounce forceLogout() above does.
// Separate flag from `loggedOut` (own terminal state, own destination) but
// same reasoning: must be set before queryClient.clear() re-triggers a
// synchronous refetch that could otherwise re-enter this function mid-navigation.
let suspended = false;
function forceSuspended() {
  if (typeof window === "undefined" || suspended) return;
  suspended = true;
  useAuthStore.getState().clear();
  queryClient.clear();
  void syncAppBadge(0);
  window.location.href = new URL("/suspended", window.location.origin).href;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url = original?.url ?? "";
    const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;

    if (code === "ACCOUNT_SUSPENDED") {
      forceSuspended();
      return Promise.reject(error);
    }

    if (status === 401 && !original._retry && !url.includes("/auth/")) {
      original._retry = true;
      refreshing ??= doRefresh().finally(() => (refreshing = null));
      const result = await refreshing;
      if (result === "renewed") return api(original);
      // Only a backend verdict ends the session. If the refresh never got
      // through, mark the error so callers (AuthBootstrap) retry instead of
      // tearing the session down — see the RefreshResult note above.
      if (result === "rejected") forceLogout();
      else
        (error as AxiosError & { authUnreachable?: boolean }).authUnreachable =
          true;
    }
    return Promise.reject(error);
  },
);

// Normalize API error message for UI.
export function apiErrorMessage(
  err: unknown,
  fallback = "Something went wrong",
): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}
