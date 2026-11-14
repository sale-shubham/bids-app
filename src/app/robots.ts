import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/sell', '/admin', '/profile', '/my-bids', '/watchlist', '/notifications'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
