// Canonical site origin for sitemap, robots and absolute URLs.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002').replace(/\/+$/, '');
