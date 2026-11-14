// The backend's absolute origin — one value for every caller: the browser's
// axios instance (src/lib/api-client.ts), src/proxy.ts's server-side refresh,
// the service worker (passed to /sw.js as `?api=`, see
// src/components/common/sw-register.tsx) and that worker's CSP
// (next.config.ts). There is no same-origin proxy in front of the API any
// more (removed 2026-11-03), so the browser always calls it directly; see
// readme/flows/api-connection.md.
//
// For the auth cookies to work the API host must share the app's registrable
// domain on a deployed branch (dev.example.com → api.dev.example.com,
// app.example.com → api.example.com), so `Domain=COOKIE_DOMAIN` cookies stay
// first-party, and the API's CORS must allow the app origin with credentials.
//
// It lives here rather than being read from `process.env` at each call site so
// the fallback is applied everywhere: `src/proxy.ts` once interpolated the
// variable raw, which produced a request to "undefined/auth/refresh" whenever
// it was missing from the deploy env. A trailing slash is dropped so
// `${API_ORIGIN}/path` never doubles it.
export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
