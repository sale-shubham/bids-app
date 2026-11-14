import type { MetadataRoute } from 'next';
import { serverGet } from '@/lib/server-api';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

const STATIC_PATHS = [
  '/',
  '/auctions',
  '/leaderboard',
  '/about',
  '/how-it-works',
  '/contact',
  '/pages/terms-conditions',
  '/pages/privacy-policy',
  '/pages/refund-policy',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${SITE_URL}${p === '/' ? '' : p}`,
    changeFrequency: p === '/' || p === '/auctions' ? 'hourly' : 'monthly',
    priority: p === '/' ? 1 : p === '/auctions' ? 0.9 : 0.5,
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
