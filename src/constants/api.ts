// The backend base URL the BROWSER uses - one value for every browser-side
// caller: the axios instance (src/lib/api-client.ts) and the service worker
// (passed to /sw.js as `?api=`, see src/components/common/sw-register.tsx).
//
// Two deployment modes (readme/flows/deployment.md):
//  1. Custom domain: NEXT_PUBLIC_API_URL is the API's absolute URL on the app's
//     own site (https://api.example.com) so the auth cookies stay first-party,
//     and the API's CORS allows the app origin with credentials.
//  2. Same-origin proxy ("no custom domain"): NEXT_PUBLIC_API_URL=/api and the
//     server env API_PROXY_TARGET holds the raw API Gateway URL; next.config.ts
//     rewrites /api/:path* to it, so the browser only ever talks to the app origin.
//
// A trailing slash is dropped so `${API_ORIGIN}/path` never doubles it. The
// fallback keeps a build without the variable from crashing (next.config.ts warns).
export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

/** True in proxy mode: the browser base is a same-origin path such as `/api`. */
export const API_IS_RELATIVE = API_ORIGIN.startsWith('/');

/**
 * The absolute backend origin for SERVER-side code (RSC fetches, src/proxy.ts),
 * where a relative base cannot be fetched. Absolute NEXT_PUBLIC_API_URL wins;
 * in proxy mode it is the server-only API_PROXY_TARGET. Never import into
 * client code: API_PROXY_TARGET is not inlined into the browser bundle.
 */
export function serverApiOrigin(): string {
  if (!API_IS_RELATIVE) return API_ORIGIN;
  const target = process.env.API_PROXY_TARGET?.replace(/\/+$/, '');
  if (target) return target;
  console.warn('[api] NEXT_PUBLIC_API_URL is relative but API_PROXY_TARGET is not set - server requests fall back to http://localhost:4000');
  return 'http://localhost:4000';
}
