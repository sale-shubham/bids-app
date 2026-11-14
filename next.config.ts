import { buildNextImageRemotePatterns } from '@/utils/remoteImagesNext';
import { API_ORIGIN } from '@/constants/api';
import type { NextConfig } from 'next';

// The worker's push re-subscribe calls the API host directly (public/sw.js),
// so its CSP must allow that one origin and nothing else.
const SW_CONNECT_SRC = `'self' ${new URL(API_ORIGIN).origin}`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next/image remote hosts from NEXT_PUBLIC_IMAGE_ORIGINS (comma-separated origins).
  images: buildNextImageRemotePatterns(process.env.NEXT_PUBLIC_IMAGE_ORIGINS),
  // No rewrite or proxy for the API: the browser calls NEXT_PUBLIC_API_URL
  // directly (src/constants/api.ts, readme/flows/api-connection.md).

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
        // running build to detect a deploy — a cached copy means the update
        // prompt never fires.
        source: '/version.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
