import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in areas and guest-only auth pages; the public pages (auctions, leaderboard,
        // sellers, /pages/*) stay crawlable. The marketing site has its own robots.txt.
        disallow: ['/sell', '/admin', '/profile', '/my-bids', '/watchlist', '/notifications', '/login', '/signup', '/forgot-password', '/reset-password'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
