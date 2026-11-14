import { buildNextImageRemotePatterns } from '@/utils/remoteImagesNext';
import type { NextConfig } from 'next';

// Must never throw at build: a missing env var degrades to a safe default and a
// warning, so a misconfigured Amplify branch still builds (and is obvious in the log).
// Same derivation as src/constants/api.ts (kept inline so the config has no app imports).
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!rawApiUrl) {
  console.warn(
    '[next.config] NEXT_PUBLIC_API_URL is not set - falling back to http://localhost:4000. ' +
      'Set it to the API origin (custom-domain mode) or to /api together with API_PROXY_TARGET (proxy mode).',
  );
}
const API_ORIGIN = (rawApiUrl || 'http://localhost:4000').replace(/\/+$/, '');
const API_IS_RELATIVE = API_ORIGIN.startsWith('/');

// Optional same-origin proxy ("no custom domain" mode): /api/:path* -> API Gateway.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET?.replace(/\/+$/, '');
if (API_IS_RELATIVE && !API_PROXY_TARGET) {
  console.warn('[next.config] NEXT_PUBLIC_API_URL is relative (proxy mode) but API_PROXY_TARGET is not set - /api requests will 404.');
}
if (!API_IS_RELATIVE && API_PROXY_TARGET) {
  console.warn('[next.config] API_PROXY_TARGET is set but NEXT_PUBLIC_API_URL is absolute - the /api rewrite is enabled but unused.');
}

// The worker's push re-subscribe calls the API directly (public/sw.js), so its
// CSP allows that one origin - or just 'self' when the API is behind /api.
let apiOrigin = '';
if (!API_IS_RELATIVE) {
  try {
    apiOrigin = new URL(API_ORIGIN).origin;
  } catch {
    console.warn(`[next.config] NEXT_PUBLIC_API_URL "${API_ORIGIN}" is not a valid URL - the service worker CSP allows 'self' only.`);
  }
}
const SW_CONNECT_SRC = `'self' ${apiOrigin}`.trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next/image remote hosts from NEXT_PUBLIC_IMAGE_ORIGINS (comma-separated origins).
  images: buildNextImageRemotePatterns(process.env.NEXT_PUBLIC_IMAGE_ORIGINS),

  // Proxy mode only (API_PROXY_TARGET set): the browser calls /api/* on the app
  // origin and Next forwards it to API Gateway, so auth cookies are first-party
  // without a custom domain. Custom-domain mode has no rewrites at all.
  async rewrites() {
    if (!API_PROXY_TARGET) return [];
    return [{ source: '/api/:path*', destination: `${API_PROXY_TARGET}/:path*` }];
  },

  // Security + service-worker headers, per
  // https://nextjs.org/docs/app/guides/progressive-web-apps ("Securing your
  // application"). The /sw.js no-store rule is load-bearing rather than
  // hygiene: without it the host serves public/sw.js from its default
  // long-lived cache and the browser reads the worker script back out of the
  // HTTP cache, so a broken worker can never be replaced by a deploy.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self'; connect-src ${SW_CONNECT_SRC}` },
        ],
      },
      {
        // fetchDeployedBuildId() (src/lib/pwa.ts) compares this against the
        // running build to detect a deploy - a cached copy means the update
        // prompt never fires.
        source: '/version.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
