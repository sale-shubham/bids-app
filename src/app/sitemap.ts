import type { MetadataRoute } from 'next';
import { serverGet } from '@/lib/server-api';
import { SITE_URL } from '@/lib/site';
import { PUBLIC_LEGAL_PAGES } from '@/constants/legal';

export const revalidate = 3600;

// Only the app's own public pages. About / How it works / Contact and the
// landing page belong to the website's sitemap (bids-website). Seller pages have
// no list endpoint; crawlers reach them through the links on auction pages.
const STATIC_PATHS = [
  '/auctions',
  '/leaderboard',
  ...PUBLIC_LEGAL_PAGES.map((p) => `/pages/${p.slug}`),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: p === '/auctions' ? 'hourly' : p === '/leaderboard' ? 'daily' : 'monthly',
    priority: p === '/auctions' ? 1 : p === '/leaderboard' ? 0.6 : 0.4,
  }));

  // Fail soft: if the API is down the static list is still a valid sitemap.
  try {
    const d = await serverGet<{ items?: { id: string; updatedAt: string }[] }>('/auctions/sitemap', {
      revalidate: 3600,
      notFoundOn404: false,
    });
    for (const a of d?.items ?? []) {
      entries.push({
        url: `${SITE_URL}/auctions/${a.id}`,
        lastModified: new Date(a.updatedAt),
        changeFrequency: 'hourly',
        priority: 0.7,
      });
    }
  } catch {
    // API down: keep the static list.
  }
  return entries;
}
